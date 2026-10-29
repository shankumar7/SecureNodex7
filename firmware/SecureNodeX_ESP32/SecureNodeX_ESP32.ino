/*
 ==============================================================================
  SecureNodeX - ESP32 Firmware Implementation (ESP32 Arduino Core 3.x / mbedtls 3.x)
  Target: ESP32 Dev Module / NodeMCU-32S / ESP32-WROOM-32
  Specs: docs/06_MESSAGE_FORMAT.md & docs/08_FIRMWARE_SPEC.md
 ==============================================================================
*/

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include "esp_system.h"
#include "mbedtls/sha256.h"
#include "mbedtls/pk.h"
#include "mbedtls/base64.h"

// -----------------------------------------------------------------------------
// 1. NETWORK & CLUSTER CONFIGURATION (UPDATE WITH YOUR WI-FI CREDENTIALS)
// -----------------------------------------------------------------------------
const char* WIFI_SSID     = "YOUR_WIFI_NAME";       // <-- Enter your Wi-Fi SSID
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";   // <-- Enter your Wi-Fi Password

// Laptop 1 LAN IP running SecureNodeX
const char* SNX_SERVER_IP = "172.16.9.48";          // <-- Your Laptop 1 IP
const int   MQTT_PORT     = 1883;

// Device Identity
const char* DEVICE_ID     = "esp32-01";
const char* TOPIC         = "snx/v1/dev/esp32-01/telemetry";

// Publishing Interval (milliseconds)
const unsigned long PUBLISH_INTERVAL_MS = 4000; // 4 seconds for live demo

// -----------------------------------------------------------------------------
// 2. EMBEDDED NIST P-256 PRIVATE KEY (PEM FORMAT)
// -----------------------------------------------------------------------------
const char* DEVICE_PRIVATE_KEY_PEM =
"-----BEGIN EC PRIVATE KEY-----\n"
"MHcCAQEEIHfA6NPig/DvDbYPjC/8rYzpBasevX2cql3Mj4S6RVYpoAoGCCqGSM49\n"
"AwEHoUQDQgAEHrSgsw1hYVtA9O2egGvJwj0zFY2ZBhYFpCuhpiDEuz/XMYxhGggy\n"
"YMLQIkfulp5UvEKVM+YvW9SoWDtjG+CnoQ==\n"
"-----END EC PRIVATE KEY-----\n";

// -----------------------------------------------------------------------------
// 3. GLOBAL OBJECTS & STATE
// -----------------------------------------------------------------------------
WiFiClient espClient;
PubSubClient mqttClient(espClient);

mbedtls_pk_context pk;
unsigned long lastPublishTime = 0;
uint32_t messageSeq = 1;

// Hardware RNG callback for mbedtls 3.x
static int esp32_rng(void *p_rng, unsigned char *output, size_t output_len) {
    esp_fill_random(output, output_len);
    return 0;
}

// -----------------------------------------------------------------------------
// 4. HELPER: Base64URL Encoding (RFC 4648 without padding)
// -----------------------------------------------------------------------------
String base64UrlEncode(const uint8_t* data, size_t len) {
    size_t dlen = 0;
    mbedtls_base64_encode(NULL, 0, &dlen, data, len);
    uint8_t* out = (uint8_t*)malloc(dlen + 1);
    mbedtls_base64_encode(out, dlen, &dlen, data, len);
    out[dlen] = '\0';

    String str = String((char*)out);
    free(out);

    // Convert standard Base64 to Base64URL
    str.replace('+', '-');
    str.replace('/', '_');
    while (str.endsWith("=")) {
        str.remove(str.length() - 1);
    }
    return str;
}

// -----------------------------------------------------------------------------
// 5. HELPER: Convert ASN.1 DER ECDSA Signature to Raw 64-byte (r||s)
// -----------------------------------------------------------------------------
bool derToRawRS(const uint8_t *der, size_t der_len, uint8_t raw[64]) {
    memset(raw, 0, 64);
    if (der_len < 8 || der[0] != 0x30) return false;
    size_t idx = 2; // skip 0x30 and len
    if (der[1] & 0x80) {
        idx = 2 + (der[1] & 0x7F);
    }

    // Parse r
    if (idx >= der_len || der[idx] != 0x02) return false;
    idx++;
    size_t r_len = der[idx++];
    const uint8_t *r_val = &der[idx];
    idx += r_len;

    // Parse s
    if (idx >= der_len || der[idx] != 0x02) return false;
    idx++;
    size_t s_len = der[idx++];
    const uint8_t *s_val = &der[idx];

    // r: strip leading 0x00 if 33 bytes
    if (r_len == 33 && r_val[0] == 0x00) {
        r_val++;
        r_len--;
    }
    if (r_len > 32) return false;
    memcpy(raw + (32 - r_len), r_val, r_len);

    // s: strip leading 0x00 if 33 bytes
    if (s_len == 33 && s_val[0] == 0x00) {
        s_val++;
        s_len--;
    }
    if (s_len > 32) return false;
    memcpy(raw + 32 + (32 - s_len), s_val, s_len);

    return true;
}

// -----------------------------------------------------------------------------
// 6. HELPER: ECDSA P-256 Sign and Output Raw (r||s) 64-byte Signature
// -----------------------------------------------------------------------------
bool signInputString(const String& inputStr, String& outSigBase64Url) {
    // Step A: SHA-256 Digest of canonical input string
    uint8_t hash[32];
    mbedtls_sha256((const unsigned char*)inputStr.c_str(), inputStr.length(), hash, 0);

    // Step B: Sign using mbedtls 3.x public API
    uint8_t der_sig[128];
    size_t der_len = 0;
    int ret = mbedtls_pk_sign(&pk, MBEDTLS_MD_SHA256, hash, 32, der_sig, sizeof(der_sig), &der_len, esp32_rng, NULL);
    if (ret != 0) {
        Serial.printf("[ECC ERR] mbedtls_pk_sign failed: -0x%04x\n", -ret);
        return false;
    }

    // Step C: Convert DER to Raw (r||s) 64-byte buffer
    uint8_t rawSig[64];
    if (!derToRawRS(der_sig, der_len, rawSig)) {
        Serial.println("[ECC ERR] Failed to convert DER to raw r||s");
        return false;
    }

    // Step D: Encode as Base64URL
    outSigBase64Url = base64UrlEncode(rawSig, 64);
    return true;
}

// -----------------------------------------------------------------------------
// 7. NTP TIME SYNCHRONIZATION
// -----------------------------------------------------------------------------
void syncNtpTime() {
    Serial.println("[NTP] Synchronizing UTC time from pool.ntp.org...");
    configTime(0, 0, "pool.ntp.org", "time.google.com");

    time_t nowSecs = 0;
    int retry = 0;
    while (nowSecs < 1700000000 && retry < 25) {
        delay(500);
        nowSecs = time(nullptr);
        Serial.print(".");
        retry++;
    }
    Serial.println();
    if (nowSecs >= 1700000000) {
        Serial.printf("[NTP OK] Current Epoch Time: %lu\n", (unsigned long)nowSecs);
    } else {
        Serial.println("[NTP WARN] NTP timeout, using fallback timestamp.");
    }
}

// -----------------------------------------------------------------------------
// 8. WI-FI & MQTT CONNECTION MANAGERS
// -----------------------------------------------------------------------------
void connectWiFi() {
    if (WiFi.status() == WL_CONNECTED) return;

    Serial.printf("\n[WIFI] Connecting to SSID '%s'...", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 40) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n[WIFI OK] Connected!");
        Serial.printf("[WIFI OK] ESP32 IP Address: %s\n", WiFi.localIP().toString().c_str());
        syncNtpTime();
    } else {
        Serial.println("\n[WIFI FAIL] Connection failed. Check SSID and Password.");
    }
}

void reconnectMqtt() {
    if (mqttClient.connected()) return;

    Serial.printf("[MQTT] Connecting to SecureNodeX Broker at %s:%d...\n", SNX_SERVER_IP, MQTT_PORT);
    String clientId = String("SNX-") + DEVICE_ID + "-" + String(random(0xffff), HEX);

    if (mqttClient.connect(clientId.c_str())) {
        Serial.println("[MQTT OK] Connected to Mosquitto!");
    } else {
        Serial.printf("[MQTT FAIL] Connect error rc=%d. Will retry next cycle.\n", mqttClient.state());
    }
}

// -----------------------------------------------------------------------------
// 9. SETUP INITIALIZATION
// -----------------------------------------------------------------------------
void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n========================================================");
    Serial.println("       SecureNodeX IoT Firmware (ESP32 Node)            ");
    Serial.println("========================================================");

    // Initialize mbedtls ECC Context
    mbedtls_pk_init(&pk);
    
    // mbedtls 3.x has 7 arguments for mbedtls_pk_parse_key
    int ret = mbedtls_pk_parse_key(&pk, (const unsigned char*)DEVICE_PRIVATE_KEY_PEM,
                                   strlen(DEVICE_PRIVATE_KEY_PEM) + 1, NULL, 0, esp32_rng, NULL);
    if (ret != 0) {
        Serial.printf("[ERR] Failed to parse ECC Private Key: -0x%04x\n", -ret);
    } else {
        Serial.println("[ECC OK] NIST P-256 Private Key parsed and loaded into memory.");
    }

    // Configure MQTT
    mqttClient.setServer(SNX_SERVER_IP, MQTT_PORT);
    mqttClient.setBufferSize(1024);

    connectWiFi();
}

// -----------------------------------------------------------------------------
// 10. MAIN LOOP: SENSE -> SIGN -> PUBLISH
// -----------------------------------------------------------------------------
void loop() {
    if (WiFi.status() != WL_CONNECTED) {
        connectWiFi();
    }

    if (!mqttClient.connected()) {
        reconnectMqtt();
    }
    mqttClient.loop();

    unsigned long currentMillis = millis();
    if (currentMillis - lastPublishTime >= PUBLISH_INTERVAL_MS) {
        lastPublishTime = currentMillis;

        time_t nowTs = time(nullptr);
        if (nowTs < 1700000000) {
            nowTs = 1791535000 + (messageSeq * 4); // Fallback epoch
        }

        // Generate Sensor Readings (Mock or internal ESP32 sensors)
        float tempC = 23.5 + (random(0, 30) * 0.1);
        float humPct = 48.0 + (random(0, 40) * 0.1);
        int vbatMv = 3900 + random(-50, 50);

        // Build Payload JSON
        StaticJsonDocument<256> payloadDoc;
        payloadDoc["temp_c"] = tempC;
        payloadDoc["hum_pct"] = humPct;
        payloadDoc["vbat_mv"] = vbatMv;
        payloadDoc["rssi"] = WiFi.RSSI();

        String payloadStr;
        serializeJson(payloadDoc, payloadStr);

        // Base64URL encode payload 'p'
        String p_encoded = base64UrlEncode((const uint8_t*)payloadStr.c_str(), payloadStr.length());

        // Canonical Signature Input string per docs/06:
        // "SNX1\n" + d + "\n" + s + "\n" + t + "\n" + y + "\n" + p
        String signInput = "SNX1\n" + String(DEVICE_ID) + "\n" + String(messageSeq) + "\n" +
                           String((unsigned long)nowTs) + "\n" + "tel\n" + p_encoded;

        // Perform NIST P-256 ECDSA Signing
        String signature_g = "";
        if (!signInputString(signInput, signature_g)) {
            Serial.println("[ERR] Skipping message due to signing error.");
            return;
        }

        // Build Complete SecureNodeX Envelope
        StaticJsonDocument<768> envDoc;
        envDoc["v"] = 1;
        envDoc["d"] = DEVICE_ID;
        envDoc["s"] = messageSeq;
        envDoc["t"] = (unsigned long)nowTs;
        envDoc["y"] = "tel";
        envDoc["p"] = p_encoded;
        envDoc["g"] = signature_g;

        String envelopeStr;
        serializeJson(envDoc, envelopeStr);

        // Publish to Mosquitto MQTT Broker
        if (mqttClient.connected()) {
            bool pubOk = mqttClient.publish(TOPIC, envelopeStr.c_str());
            if (pubOk) {
                Serial.printf("\n[PUBLISH #%u OK] Ingested into SecureNodeX:\n", messageSeq);
                Serial.printf("  Topic: %s\n", TOPIC);
                Serial.printf("  Payload: %s\n", payloadStr.c_str());
                Serial.printf("  P-256 Raw Sig: %s...\n", signature_g.substring(0, 24).c_str());
            } else {
                Serial.println("[MQTT ERR] Publish buffer full or failed.");
            }
        } else {
            Serial.println("[MQTT WARN] Broker disconnected. Waiting for next cycle.");
        }

        messageSeq++;
    }
}

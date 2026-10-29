"""SecureNodeX configuration loading."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "SecureNodeX"
    CHAIN_RPC_URL: str = "http://chain:8545"
    CHAIN_ID: int = 20260
    OPERATOR_KEY_FILE: str = "/run/secrets/operator_key"
    DEPLOYMENTS_FILE: str = "/app/deployments/besu.json"
    DATABASE_URL: str = "postgresql+psycopg://snx:CHANGE_ME@postgres:5432/snx"
    API_PUBLIC_URL: str = "https://api.snx.lan:8443"
    JWT_KEY_FILE: str = "/run/secrets/jwt_es256.pem"
    CA_URL: str = "https://ca.snx.lan:9443"
    CA_CLIENT_CERT: str = "/run/secrets/svc.crt"
    CA_CLIENT_KEY: str = "/run/secrets/svc.key"
    CA_CHAIN: str = "/run/secrets/ca-chain.pem"
    MQTT_HOST: str = "broker.snx.lan"
    MQTT_PORT: int = 8883
    CHUNK_SIZE: int = 65536
    REPLICATION_R: int = 3
    WRITE_QUORUM_W: int = 2
    HEARTBEAT_S: int = 5
    GC_GRACE_S: int = 300
    BATCH_MAX_MSGS: int = 100
    BATCH_MAX_SECONDS: int = 30
    DEVICE_CERT_TTL_HOURS: int = 2160
    ADMIN_CONTENT_ACCESS: bool = False

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()

"""SecureNodeX CA Core Library.

ECC NIST P-256 (secp256r1) X.509 PKI management:
- Root CA generation (offline, 10y)
- Intermediate CA generation (online, 1y)
- Certificate issuance with strict profiles (broker, device, service, storage-node)
- SubjectPublicKeyInfo SHA-256 fingerprinting
- X.509 CRL generation and revocation management
"""

from __future__ import annotations

import datetime
import hashlib
from typing import Literal

from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec

CertKind = Literal["broker", "device", "service", "storage-node", "user"]


def generate_p256_private_key() -> ec.EllipticCurvePrivateKey:
    """Generates an ECC NIST P-256 (secp256r1) private key."""
    return ec.generate_private_key(ec.SECP256R1(), default_backend())


def private_key_to_pem(key: ec.EllipticCurvePrivateKey, password: str | None = None) -> bytes:
    """Serializes a private key to PEM format."""
    encryption: serialization.KeySerializationEncryption
    if password:
        encryption = serialization.BestAvailableEncryption(password.encode("utf-8"))
    else:
        encryption = serialization.NoEncryption()

    return key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=encryption,
    )


def public_key_to_pem(key: ec.EllipticCurvePublicKey) -> bytes:
    """Serializes a public key to PEM format."""
    return key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )


def load_private_key(pem_bytes: bytes, password: str | None = None) -> ec.EllipticCurvePrivateKey:
    """Loads an ECC private key from PEM bytes."""
    pwd = password.encode("utf-8") if password else None
    key = serialization.load_pem_private_key(pem_bytes, password=pwd, backend=default_backend())
    if not isinstance(key, ec.EllipticCurvePrivateKey):
        raise ValueError("Key is not an EllipticCurvePrivateKey")
    return key


def load_certificate(pem_bytes: bytes) -> x509.Certificate:
    """Loads an X.509 certificate from PEM bytes."""
    return x509.load_pem_x509_certificate(pem_bytes, default_backend())


def compute_public_key_fingerprint(
    cert_or_key: x509.Certificate | ec.EllipticCurvePublicKey,
) -> str:
    """Computes lowercase hex SHA-256 of the SubjectPublicKeyInfo DER.

    Per docs/00 glossary & docs/02:
    Fingerprint = lowercase hex SHA-256 of the certificate SubjectPublicKeyInfo DER.
    """
    pub_key = cert_or_key.public_key() if isinstance(cert_or_key, x509.Certificate) else cert_or_key

    spki_der = pub_key.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return hashlib.sha256(spki_der).hexdigest().lower()


def create_root_ca(
    common_name: str = "SecureNodeX Root CA",
    validity_days: int = 3650,  # 10 years
) -> tuple[ec.EllipticCurvePrivateKey, x509.Certificate]:
    """Generates a self-signed Root CA (ECC P-256)."""
    private_key = generate_p256_private_key()
    public_key = private_key.public_key()

    subject = issuer = x509.Name(
        [
            x509.NameAttribute(x509.oid.NameOID.ORGANIZATION_NAME, "SecureNodeX"),
            x509.NameAttribute(x509.oid.NameOID.ORGANIZATIONAL_UNIT_NAME, "Root CA"),
            x509.NameAttribute(x509.oid.NameOID.COMMON_NAME, common_name),
        ]
    )

    now = datetime.datetime.now(datetime.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(public_key)
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(minutes=5))
        .not_valid_after(now + datetime.timedelta(days=validity_days))
        .add_extension(
            x509.BasicConstraints(ca=True, path_length=1),
            critical=True,
        )
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                key_cert_sign=True,
                crl_sign=True,
                content_commitment=False,
                key_encipherment=False,
                data_encipherment=False,
                key_agreement=False,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .add_extension(
            x509.SubjectKeyIdentifier.from_public_key(public_key),
            critical=False,
        )
        .sign(private_key, hashes.SHA256(), default_backend())
    )

    return private_key, cert


def create_intermediate_ca(
    root_key: ec.EllipticCurvePrivateKey,
    root_cert: x509.Certificate,
    common_name: str = "SecureNodeX Intermediate CA",
    validity_days: int = 365,  # 1 year
) -> tuple[ec.EllipticCurvePrivateKey, x509.Certificate]:
    """Generates an Intermediate CA signed by the Root CA (ECC P-256)."""
    private_key = generate_p256_private_key()
    public_key = private_key.public_key()

    subject = x509.Name(
        [
            x509.NameAttribute(x509.oid.NameOID.ORGANIZATION_NAME, "SecureNodeX"),
            x509.NameAttribute(x509.oid.NameOID.ORGANIZATIONAL_UNIT_NAME, "Intermediate CA"),
            x509.NameAttribute(x509.oid.NameOID.COMMON_NAME, common_name),
        ]
    )

    now = datetime.datetime.now(datetime.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(root_cert.subject)
        .public_key(public_key)
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(minutes=5))
        .not_valid_after(now + datetime.timedelta(days=validity_days))
        .add_extension(
            x509.BasicConstraints(ca=True, path_length=0),
            critical=True,
        )
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                key_cert_sign=True,
                crl_sign=True,
                content_commitment=False,
                key_encipherment=False,
                data_encipherment=False,
                key_agreement=False,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .add_extension(
            x509.SubjectKeyIdentifier.from_public_key(public_key),
            critical=False,
        )
        .add_extension(
            x509.AuthorityKeyIdentifier.from_issuer_public_key(
                root_cert.public_key()  # type: ignore[arg-type]
            ),
            critical=False,
        )
        .sign(root_key, hashes.SHA256(), default_backend())
    )

    return private_key, cert


def issue_leaf_certificate(
    ca_key: ec.EllipticCurvePrivateKey,
    ca_cert: x509.Certificate,
    csr_or_pubkey: x509.CertificateSigningRequest | ec.EllipticCurvePublicKey,
    kind: CertKind,
    common_name: str,
    principal_id: str | None = None,
    san_dns_names: list[str] | None = None,
    san_ips: list[str] | None = None,
    validity_hours: int | None = None,
) -> x509.Certificate:
    """Issues a leaf certificate enforcing SecureNodeX profiles (docs/02 section 2)."""
    if isinstance(csr_or_pubkey, x509.CertificateSigningRequest):
        if not csr_or_pubkey.is_signature_valid:
            raise ValueError("CSR signature verification failed")
        leaf_pubkey = csr_or_pubkey.public_key()
    else:
        leaf_pubkey = csr_or_pubkey

    if not isinstance(leaf_pubkey, ec.EllipticCurvePublicKey):
        raise ValueError("Leaf key must be ECC P-256")

    ou_map: dict[CertKind, str] = {
        "broker": "broker",
        "device": "device",
        "service": "service",
        "storage-node": "storage-node",
        "user": "user",
    }
    ou = ou_map[kind]

    subject = x509.Name(
        [
            x509.NameAttribute(x509.oid.NameOID.ORGANIZATION_NAME, "SecureNodeX"),
            x509.NameAttribute(x509.oid.NameOID.ORGANIZATIONAL_UNIT_NAME, ou),
            x509.NameAttribute(x509.oid.NameOID.COMMON_NAME, common_name),
        ]
    )

    # Default validity: 90 days for broker/device, 30 days for service/storage, or explicit hours
    if validity_hours is not None:
        duration = datetime.timedelta(hours=validity_hours)
    elif kind in ("broker", "device"):
        duration = datetime.timedelta(days=90)
    else:
        duration = datetime.timedelta(days=30)

    now = datetime.datetime.now(datetime.timezone.utc)
    builder = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(ca_cert.subject)
        .public_key(leaf_pubkey)
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(minutes=5))
        .not_valid_after(now + duration)
        .add_extension(
            x509.BasicConstraints(ca=False, path_length=None),
            critical=True,
        )
        .add_extension(
            x509.SubjectKeyIdentifier.from_public_key(leaf_pubkey),
            critical=False,
        )
        .add_extension(
            x509.AuthorityKeyIdentifier.from_issuer_public_key(
                ca_cert.public_key()  # type: ignore[arg-type]
            ),
            critical=False,
        )
    )

    # KeyUsage & ExtendedKeyUsage per profile
    if kind == "broker":
        builder = builder.add_extension(
            x509.KeyUsage(
                digital_signature=True,
                key_encipherment=False,
                key_agreement=True,
                key_cert_sign=False,
                crl_sign=False,
                content_commitment=False,
                data_encipherment=False,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        ).add_extension(
            x509.ExtendedKeyUsage([x509.oid.ExtendedKeyUsageOID.SERVER_AUTH]),
            critical=False,
        )
    elif kind == "device":
        builder = builder.add_extension(
            x509.KeyUsage(
                digital_signature=True,
                key_encipherment=False,
                key_agreement=False,
                key_cert_sign=False,
                crl_sign=False,
                content_commitment=False,
                data_encipherment=False,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        ).add_extension(
            x509.ExtendedKeyUsage([x509.oid.ExtendedKeyUsageOID.CLIENT_AUTH]),
            critical=False,
        )
    elif kind in ("service", "storage-node"):
        builder = builder.add_extension(
            x509.KeyUsage(
                digital_signature=True,
                key_encipherment=False,
                key_agreement=True,
                key_cert_sign=False,
                crl_sign=False,
                content_commitment=False,
                data_encipherment=False,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        ).add_extension(
            x509.ExtendedKeyUsage(
                [
                    x509.oid.ExtendedKeyUsageOID.CLIENT_AUTH,
                    x509.oid.ExtendedKeyUsageOID.SERVER_AUTH,
                ]
            ),
            critical=False,
        )
    else:  # user
        builder = builder.add_extension(
            x509.KeyUsage(
                digital_signature=True,
                key_encipherment=False,
                key_agreement=True,
                key_cert_sign=False,
                crl_sign=False,
                content_commitment=False,
                data_encipherment=False,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        ).add_extension(
            x509.ExtendedKeyUsage([x509.oid.ExtendedKeyUsageOID.CLIENT_AUTH]),
            critical=False,
        )

    # Subject Alternative Names (SAN)
    san_list: list[x509.GeneralName] = []
    if principal_id:
        did = f"did:snx:{principal_id}" if not principal_id.startswith("did:snx:") else principal_id
        san_list.append(x509.UniformResourceIdentifier(did))

    if san_dns_names:
        for dns in san_dns_names:
            san_list.append(x509.DNSName(dns))

    if san_ips:
        import ipaddress

        for ip in san_ips:
            san_list.append(x509.IPAddress(ipaddress.ip_address(ip)))

    if san_list:
        builder = builder.add_extension(
            x509.SubjectAlternativeName(san_list),
            critical=False,
        )

    return builder.sign(ca_key, hashes.SHA256(), default_backend())


def create_crl(
    ca_key: ec.EllipticCurvePrivateKey,
    ca_cert: x509.Certificate,
    revoked_serials: list[tuple[int, datetime.datetime, x509.ReasonFlags]],
    next_update_days: int = 7,
) -> x509.CertificateRevocationList:
    """Generates an X.509 Certificate Revocation List (CRL)."""
    now = datetime.datetime.now(datetime.timezone.utc)
    builder = (
        x509.CertificateRevocationListBuilder()
        .issuer_name(ca_cert.subject)
        .last_update(now - datetime.timedelta(minutes=5))
        .next_update(now + datetime.timedelta(days=next_update_days))
    )

    for serial, revoked_at, reason in revoked_serials:
        revoked_cert = (
            x509.RevokedCertificateBuilder()
            .serial_number(serial)
            .revocation_date(revoked_at)
            .add_extension(x509.CRLReason(reason), critical=False)
            .build()
        )
        builder = builder.add_revoked_certificate(revoked_cert)

    return builder.sign(ca_key, hashes.SHA256(), default_backend())


def create_csr(
    private_key: ec.EllipticCurvePrivateKey,
    common_name: str,
    kind: CertKind = "device",
) -> x509.CertificateSigningRequest:
    """Generates a CSR for a device or service."""
    ou_map = {
        "broker": "broker",
        "device": "device",
        "service": "service",
        "storage-node": "storage-node",
        "user": "user",
    }
    subject = x509.Name(
        [
            x509.NameAttribute(x509.oid.NameOID.ORGANIZATION_NAME, "SecureNodeX"),
            x509.NameAttribute(
                x509.oid.NameOID.ORGANIZATIONAL_UNIT_NAME, ou_map.get(kind, "device")
            ),
            x509.NameAttribute(x509.oid.NameOID.COMMON_NAME, common_name),
        ]
    )

    return (
        x509.CertificateSigningRequestBuilder()
        .subject_name(subject)
        .sign(private_key, hashes.SHA256(), default_backend())
    )

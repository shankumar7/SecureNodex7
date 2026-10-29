"""Storage node configuration."""

import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class StorageSettings(BaseSettings):
    NODE_ID: str = os.getenv("NODE_ID", "storage-1")
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", "/tmp/snx_storage_data")
    PORT: int = int(os.getenv("PORT", "7443"))
    MAX_CAPACITY_BYTES: int = 10 * 1024 * 1024 * 1024  # 10 GiB

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


storage_settings = StorageSettings()

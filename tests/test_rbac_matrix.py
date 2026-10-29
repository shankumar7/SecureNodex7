"""Table-driven test suite for RBAC permission matrix (docs/05_RBAC.md) and separation of duties."""

import pytest

from backend.app.auth.rbac import (
    RoleBit,
    is_permission_allowed,
    mask_to_role_names,
    role_names_to_mask,
)

# Test matrix: (permission, role_bit, is_own, expected_allowed)
RBAC_TEST_CASES = [
    # principal:create (Admin only)
    ("principal:create", RoleBit.ADMIN, False, True),
    ("principal:create", RoleBit.MANAGER, False, False),
    ("principal:create", RoleBit.AUDITOR, False, False),
    ("principal:create", RoleBit.USER, False, False),
    ("principal:create", RoleBit.DEVICE, False, False),
    ("principal:create", RoleBit.STORAGE_NODE, False, False),

    # principal:set-roles (Admin, Manager limited)
    ("principal:set-roles", RoleBit.ADMIN, False, True),
    ("principal:set-roles", RoleBit.MANAGER, True, True),
    ("principal:set-roles", RoleBit.AUDITOR, False, False),
    ("principal:set-roles", RoleBit.USER, False, False),

    # device:enroll (Admin, Manager)
    ("device:enroll", RoleBit.ADMIN, False, True),
    ("device:enroll", RoleBit.MANAGER, False, True),
    ("device:enroll", RoleBit.AUDITOR, False, False),
    ("device:enroll", RoleBit.USER, False, False),
    ("device:enroll", RoleBit.DEVICE, False, False),

    # device:revoke / rotate (Admin, Manager)
    ("device:revoke", RoleBit.ADMIN, False, True),
    ("device:revoke", RoleBit.MANAGER, False, True),
    ("device:revoke", RoleBit.AUDITOR, False, False),
    ("device:rotate", RoleBit.ADMIN, False, True),
    ("device:rotate", RoleBit.MANAGER, False, True),
    ("device:rotate", RoleBit.USER, False, False),

    # device:read (Admin, Manager, Auditor, User:Own, Device:Own)
    ("device:read", RoleBit.ADMIN, False, True),
    ("device:read", RoleBit.MANAGER, False, True),
    ("device:read", RoleBit.AUDITOR, False, True),
    ("device:read", RoleBit.USER, False, False),
    ("device:read", RoleBit.USER, True, True),
    ("device:read", RoleBit.DEVICE, False, False),
    ("device:read", RoleBit.DEVICE, True, True),

    # object:create (Admin, Manager, User)
    ("object:create", RoleBit.ADMIN, False, True),
    ("object:create", RoleBit.MANAGER, False, True),
    ("object:create", RoleBit.USER, False, True),
    ("object:create", RoleBit.AUDITOR, False, False),
    ("object:create", RoleBit.DEVICE, False, False),

    # object:read_content (Admin, Manager:Own, User:Own)
    ("object:read_content", RoleBit.ADMIN, False, True),
    ("object:read_content", RoleBit.MANAGER, False, False),
    ("object:read_content", RoleBit.MANAGER, True, True),
    ("object:read_content", RoleBit.USER, False, False),
    ("object:read_content", RoleBit.USER, True, True),
    ("object:read_content", RoleBit.AUDITOR, True, False),

    # object:read_metadata (Admin, Manager, Auditor, User:Own)
    ("object:read_metadata", RoleBit.ADMIN, False, True),
    ("object:read_metadata", RoleBit.MANAGER, False, True),
    ("object:read_metadata", RoleBit.AUDITOR, False, True),
    ("object:read_metadata", RoleBit.USER, False, False),
    ("object:read_metadata", RoleBit.USER, True, True),

    # asset:mint (Admin, Manager)
    ("asset:mint", RoleBit.ADMIN, False, True),
    ("asset:mint", RoleBit.MANAGER, False, True),
    ("asset:mint", RoleBit.AUDITOR, False, False),
    ("asset:mint", RoleBit.USER, False, False),

    # asset:transfer (Admin, Manager, User:Own)
    ("asset:transfer", RoleBit.ADMIN, False, True),
    ("asset:transfer", RoleBit.MANAGER, False, True),
    ("asset:transfer", RoleBit.USER, False, False),
    ("asset:transfer", RoleBit.USER, True, True),
    ("asset:transfer", RoleBit.AUDITOR, True, False),

    # audit:read (Admin, Manager:Scoped, Auditor, User:Own)
    ("audit:read", RoleBit.ADMIN, False, True),
    ("audit:read", RoleBit.MANAGER, False, True),
    ("audit:read", RoleBit.AUDITOR, False, True),
    ("audit:read", RoleBit.USER, False, False),
    ("audit:read", RoleBit.USER, True, True),
    ("audit:read", RoleBit.DEVICE, True, False),

    # audit:verify (Admin, Manager, Auditor)
    ("audit:verify", RoleBit.ADMIN, False, True),
    ("audit:verify", RoleBit.MANAGER, False, True),
    ("audit:verify", RoleBit.AUDITOR, False, True),
    ("audit:verify", RoleBit.USER, False, False),
    ("audit:verify", RoleBit.DEVICE, False, False),

    # storage:nodes_manage (Admin only)
    ("storage:nodes_manage", RoleBit.ADMIN, False, True),
    ("storage:nodes_manage", RoleBit.MANAGER, False, False),
    ("storage:nodes_manage", RoleBit.AUDITOR, False, False),

    # storage:health_read (Admin, Manager, Auditor)
    ("storage:health_read", RoleBit.ADMIN, False, True),
    ("storage:health_read", RoleBit.MANAGER, False, True),
    ("storage:health_read", RoleBit.AUDITOR, False, True),
    ("storage:health_read", RoleBit.USER, False, False),

    # mqtt:publish_telemetry (Device only)
    ("mqtt:publish_telemetry", RoleBit.DEVICE, False, True),
    ("mqtt:publish_telemetry", RoleBit.USER, False, False),
    ("mqtt:publish_telemetry", RoleBit.ADMIN, False, False),

    # chunk:put_get (Storage-Node only)
    ("chunk:put_get", RoleBit.STORAGE_NODE, False, True),
    ("chunk:put_get", RoleBit.USER, False, False),
    ("chunk:put_get", RoleBit.ADMIN, False, False),
]


@pytest.mark.parametrize("permission, role_bit, is_own, expected_allowed", RBAC_TEST_CASES)
def test_rbac_matrix_cell(permission: str, role_bit: RoleBit, is_own: bool, expected_allowed: bool) -> None:
    """Validate every individual cell of the RBAC matrix from docs/05_RBAC.md."""
    allowed = is_permission_allowed(permission, role_bit.value, is_own_resource=is_own)
    assert allowed == expected_allowed, f"Failed for perm={permission}, role={role_bit.name}, own={is_own}"


def test_deny_by_default_unknown_permission() -> None:
    """Any unrecognised permission string must be denied for all roles."""
    for role_bit in [RoleBit.ADMIN, RoleBit.MANAGER, RoleBit.AUDITOR, RoleBit.USER, RoleBit.DEVICE]:
        assert not is_permission_allowed("unknown:magic_action", role_bit.value, is_own_resource=True)
        assert not is_permission_allowed("", role_bit.value, is_own_resource=True)


def test_role_mask_conversions() -> None:
    """Test bitmask round-trip conversions."""
    roles = ["ADMIN", "USER", "AUDITOR"]
    mask = role_names_to_mask(roles)
    assert mask == (RoleBit.ADMIN.value | RoleBit.USER.value | RoleBit.AUDITOR.value)

    extracted_roles = mask_to_role_names(mask)
    assert set(extracted_roles) == set(roles)

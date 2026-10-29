"""Rendezvous (HRW) placement hashing and diversity rule enforcement (FR-STO-3)."""

from dataclasses import dataclass
import hashlib
from typing import Sequence


@dataclass(frozen=True)
class StorageNodeInfo:
    id: str
    endpoint: str
    state: str = "UP"
    free_bytes: int = 10 * 1024 * 1024 * 1024
    draining: bool = False
    fingerprint: str = ""

    def __hash__(self) -> int:
        return hash(self.id)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, StorageNodeInfo):
            return False
        return self.id == other.id


def place_chunk(
    chunk_id: str,
    nodes: Sequence[StorageNodeInfo],
    r: int,
    min_free_bytes: int = 1024,
) -> list[StorageNodeInfo]:
    """Rendezvous (HRW) placement hashing."""
    eligible = [
        n for n in nodes
        if n.state == "UP" and not n.draining and n.free_bytes >= min_free_bytes
    ]
    if not eligible:
        return []

    ranked = sorted(
        eligible,
        key=lambda n: hashlib.sha256(f"{n.id}:{chunk_id}".encode()).digest(),
        reverse=True,
    )
    return ranked[:r]


def rank_all_nodes(
    chunk_id: str,
    nodes: Sequence[StorageNodeInfo],
    min_free_bytes: int = 1024,
) -> list[StorageNodeInfo]:
    """Return all eligible nodes ranked by HRW score for fallback/repair."""
    eligible = [
        n for n in nodes
        if n.state == "UP" and not n.draining and n.free_bytes >= min_free_bytes
    ]
    return sorted(
        eligible,
        key=lambda n: hashlib.sha256(f"{n.id}:{chunk_id}".encode()).digest(),
        reverse=True,
    )


def apply_diversity_rule(
    chunk_placements: list[list[StorageNodeInfo]],
    eligible_nodes: Sequence[StorageNodeInfo],
    r: int,
    max_iterations: int = 3,
) -> list[list[StorageNodeInfo]]:
    """Enforce diversity rule (FR-STO-3):

    If len(chunks) >= 2 and len(eligible_nodes) > R and one node appears in every chunk's placement,
    replace that node in one chunk's placement with the next-ranked node not already holding that chunk.
    """
    if len(chunk_placements) < 2 or len(eligible_nodes) <= r:
        return [list(p) for p in chunk_placements]

    result = [list(p) for p in chunk_placements]

    for _ in range(max_iterations):
        common_nodes = set(result[0])
        for p in result[1:]:
            common_nodes &= set(p)

        if not common_nodes:
            break

        over_rep_node = next(iter(common_nodes))
        # Replace in the last chunk
        last_placement = result[-1]
        available_nodes = [n for n in eligible_nodes if n not in last_placement]

        if available_nodes and over_rep_node in last_placement:
            idx = last_placement.index(over_rep_node)
            last_placement[idx] = available_nodes[0]

    return result

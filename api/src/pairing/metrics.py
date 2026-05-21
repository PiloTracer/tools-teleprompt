from dataclasses import dataclass, field
from threading import Lock
from typing import Literal

ClaimOutcome = Literal["success", "invalid_otp", "expired", "locked"]


@dataclass
class Counter:
    name: str
    labels: dict[str, str] = field(default_factory=lambda: dict[str, str]())
    _value: int = field(default=0, init=False)
    _lock: Lock = field(default_factory=Lock, init=False, repr=False)

    def inc(self, amount: int = 1) -> None:
        if amount < 0:
            msg = "counter increment must be non-negative"
            raise ValueError(msg)
        with self._lock:
            self._value += amount

    @property
    def value(self) -> int:
        with self._lock:
            return self._value


class PairingMetrics:
    """In-process counters aligned with observability-spec §2 pairing metrics."""

    def __init__(self) -> None:
        self.session_created = Counter("teleprompt_pairing_session_created_total")
        self.session_expired = Counter("teleprompt_pairing_session_expired_total")
        self._claim_by_outcome: dict[ClaimOutcome, Counter] = {}

    def _claim_counter(self, outcome: ClaimOutcome) -> Counter:
        if outcome not in self._claim_by_outcome:
            self._claim_by_outcome[outcome] = Counter(
                "teleprompt_pairing_session_claimed_total",
                {"outcome": outcome},
            )
        return self._claim_by_outcome[outcome]

    def record_session_created(self) -> None:
        self.session_created.inc()

    def record_session_claimed(self, outcome: ClaimOutcome) -> None:
        self._claim_counter(outcome).inc()

    def record_session_locked(self) -> None:
        self._claim_counter("locked").inc()

    def record_session_expired(self) -> None:
        self.session_expired.inc()

    def claim_count(self, outcome: ClaimOutcome) -> int:
        return self._claim_counter(outcome).value


pairing_metrics = PairingMetrics()

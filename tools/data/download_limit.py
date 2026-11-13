"""Cross-process cap: at most four simultaneous NASA HTTP downloads.

File locks are released by the OS if a worker exits. This is a finite-batch
resource limiter, not a persistent service. NOx and hourly diagnostics share
these same four slots.
"""
from contextlib import contextmanager
import fcntl
from pathlib import Path
import time

LOCKS = Path('/tmp/sonata-svs-download-slots')


@contextmanager
def request_slot():
    LOCKS.mkdir(parents=True, exist_ok=True)
    while True:
        for index in range(4):
            stream = (LOCKS / f'{index}.lock').open('a')
            try:
                fcntl.flock(stream, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                stream.close()
                continue
            try:
                yield
            finally:
                fcntl.flock(stream, fcntl.LOCK_UN)
                stream.close()
            return
        time.sleep(0.05)

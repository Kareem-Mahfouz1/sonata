"""Prepare NASA EIC imagery for Earth Jukebox.

This is intentionally a stub. Keep the processing pipeline outside the app so
large source assets never enter the static frontend bundle.
"""


def main() -> None:
    # TODO: read PNG frames from NASA SVS.
    # TODO: downsample frames to a small, documented grid.
    # TODO: decode pixel colors using each layer's colorbar image.
    # TODO: write compact JSON with cell time series and frame summaries.
    raise NotImplementedError("Preprocessing pipeline is not implemented yet")


if __name__ == "__main__":
    main()

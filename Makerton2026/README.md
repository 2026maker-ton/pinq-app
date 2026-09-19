# Makerton 2026 PinQ planner

This project contains a small Python planner that follows the PinQ specification from the prompt and generates a JSON response for a Yongsan-gu course search.

## Run

```bash
python planner.py sample_input.json
```

## Test

```bash
python -m unittest -v
```

The planner validates the service area, clamps the radius to the allowed range, picks local candidate stops, and returns three course options in the required JSON shape.

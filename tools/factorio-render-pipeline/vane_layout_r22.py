"""R22 calibration hypothesis: twelve evenly spaced physical outboard fins.

The provided original baked sprite shows three distinct forward-facing
heat-stained tabs plus additional outer/lower panels. This does NOT reveal
all hidden fins in 3D. Twelve is a testable candidate count rather than
a recovered original rig. Shared by all vanilla R11/R15/R16/R18/R19/R21 stages.
No custom Tech Priests models use this constant.
"""
VANE_COUNT=12
SOURCE_VISIBLE_UPPER_TAB_GROUPS=3
SOURCE_HIDDEN_TOTAL_VERIFIED=False
SOURCE_OBSERVATION="64-frame body atlas, original central upper hot-tab trio"
def angle(index):
    if not 0<=index<VANE_COUNT:
        raise ValueError("Fin index outside shared source-calibration ring")
    import math
    return math.tau*(index+.5)/VANE_COUNT

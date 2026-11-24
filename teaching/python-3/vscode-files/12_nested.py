# Nested decisions: an if inside another if. Indentation shows what belongs where.

battery_level = 60
obstacle_detected = True

if battery_level > 50:
    print("Battery level sufficient.")
    if obstacle_detected:
        print("Stop and reroute.")
    else:
        print("Continue moving forward.")
else:
    print("Battery too low! Return to charging station.")

# The same idea with "and":
if battery_level > 50 and not obstacle_detected:
    print("Safe to move forward.")

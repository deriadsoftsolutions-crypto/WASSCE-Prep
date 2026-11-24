# Python 3 practical: model answer
robot_id = "AgriMech-Beta"
battery_level = float(input("Battery level (%): "))
temperature = float(input("Temperature (C): "))
obstacle_detected = input("Obstacle ahead? (yes/no): ") == "yes"

print("=== DECISION REPORT FOR", robot_id, "===")
if battery_level < 20:
    print("Battery low: return to charging station.")
else:
    if obstacle_detected:
        print("Obstacle ahead: stop and reroute.")
    elif temperature > 35:
        print("Too hot: move to shade.")
    else:
        print("All clear: continue the mission.")

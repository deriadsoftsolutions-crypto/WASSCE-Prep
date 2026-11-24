robot_id = "AccraBot-Alpha"
system_purpose = "Urban sanitation support"
mission_duration_minutes = 120
current_power_level_percent = 78.5
is_operational = True
power_used = mission_duration_minutes * 0.5
time_left = current_power_level_percent / 0.5
recent_activities = ["Initiated drone deployment", "Detected irregular soil moisture", "Returned to charging station", "Completed urban route", "Performed data upload"]

print("=== ROBOT SYSTEM DAILY STATUS REPORT ===")
print(f"Robot ID: {robot_id}")
print(f"Purpose: {system_purpose}")
print(f"Mission time: {mission_duration_minutes} minutes")
print(f"Power left: {current_power_level_percent} %")
print(f"Operational: {is_operational}")
print(f"Power used: {power_used} %")
print(f"Time left: {time_left} minutes")
print("Activities:", recent_activities)
print("First activity:", recent_activities[0])
print("Last activity:", recent_activities[-1])

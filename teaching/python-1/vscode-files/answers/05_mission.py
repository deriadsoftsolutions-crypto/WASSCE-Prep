# Activity 5.3
mission_duration_minutes = 120          # int: whole minutes
current_power_level_percent = 78.5      # float: can have a decimal
is_operational = True                   # bool: only True or False

print("Mission time:", mission_duration_minutes, "minutes")
print("Power left:", current_power_level_percent, "%")
print("Working:", is_operational)
print(type(mission_duration_minutes), type(current_power_level_percent), type(is_operational))

# Activity 5.4
power_used = mission_duration_minutes * 0.5
time_left = current_power_level_percent / 0.5

print("Power used:", power_used, "%")          # 60.0
print("Time left:", time_left, "minutes")      # 157.0

# Extra
minutes = int(time_left)
print("That is", minutes // 60, "hours and", minutes % 60, "minutes")   # 2 hours and 37 minutes

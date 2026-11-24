# Homework model answer
robot_name = "Zeta"
speed_cm_per_second = 8.0
distance_travelled_cm = 0
is_charging = False

trip_cm = 200
time_needed = trip_cm / speed_cm_per_second

print("Robot:", robot_name)
print("Speed:", speed_cm_per_second, "cm per second")
print("Distance travelled:", distance_travelled_cm, "cm")
print("Charging:", is_charging)
print("Time to travel", trip_cm, "cm:", time_needed, "seconds")   # 25.0

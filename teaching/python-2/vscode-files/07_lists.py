# Python 2: lists. A list keeps many values together, in order.
# Predict each output before you run.

movement_log = ["forward 10cm", "turn 90deg", "stop"]
light_readings = [50, 52, 48, 55, 60]

print(movement_log)
print("First move:", movement_log[0])     # counting starts at 0
print("Last reading:", light_readings[-1])  # -1 is the last item
print("Number of readings:", len(light_readings))

movement_log.append("reverse 5cm")        # add to the end
movement_log.insert(1, "wait 2s")          # add at position 1
print(movement_log)

movement_log.remove("stop")                # remove by value
last = movement_log.pop()                  # remove the last item and keep it
print("Removed:", last)
print(movement_log)

light_readings[2] = 49                     # change an item
print(light_readings)

# Python 3: making decisions. A condition is a question with a True or False answer.
# Predict each line, then run.

battery_level = 15
print(battery_level < 20)     # True
print(battery_level == 15)    # == asks "is it equal?" (one = stores a value)
print(battery_level != 15)    # != means "not equal"

# Simple if: do something only when the condition is True
if battery_level < 20:
    print("Return to charging station")

# if-else: two possible outcomes
is_obstacle = True
if is_obstacle:
    print("Turn left")
else:
    print("Keep going")

# Try: change battery_level to 80 and is_obstacle to False, then run again.

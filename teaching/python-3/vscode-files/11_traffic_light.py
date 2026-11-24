# if-elif-else: check several conditions in order. Only the FIRST true one runs.

traffic_light = "yellow"

if traffic_light == "green":
    print("Go")
elif traffic_light == "yellow":
    print("Slow down")
else:
    print("Stop")

# Try: "green", "red", then "blue". Why does "blue" print Stop?

temperature = float(input("Temperature in degrees C: "))

if temperature > 35:
    print("Extreme heat! Shut down and move to shade.")
elif temperature > 25:
    print("Move to cooler area")
elif temperature >= 18:
    print("Stay in place")
else:
    print("Seek warmer area")

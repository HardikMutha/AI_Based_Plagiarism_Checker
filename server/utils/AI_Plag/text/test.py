import pandas as pd

# Check raw bytes of the file
with open("combined_dataset.csv", "rb") as f:
    raw = f.read(2500)
print("RAW BYTES:")
print(raw)
print()

# Check what pandas actually loads
df = pd.read_csv("combined_dataset.csv", nrows=2)
first_val = df.iloc[0, 0]
print("FIRST CELL VALUE repr():")
print(repr(first_val))
print()
print("FIRST CELL chars as hex:")
for ch in first_val[:100]:
    print(f"  {repr(ch)} -> {hex(ord(ch))}")
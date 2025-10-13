from algo2 import run_algo2
from algo4 import run_algo4

if __name__ == "__main__":
    layers, edges = run_algo2()
    print("\n--- Initial Layers (Algo2) ---\n")
    for i, layer in enumerate(layers):
        print(f"Layer {i}: {', '.join(layer)}")

    final_layers = run_algo4(layers, edges)

    print("\n--- Final Layers (After Algo4 / Rule 3) ---\n")
    for i, layer in enumerate(final_layers):
        print(f"Layer {i}: {', '.join(layer)}")

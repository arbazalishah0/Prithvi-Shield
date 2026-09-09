import os
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

MODEL_PATH = "models/general_ai_detector.pth"

if torch.backends.mps.is_available():
    device = torch.device("mps")
else:
    device = torch.device("cpu")

checkpoint = torch.load(
    MODEL_PATH,
    map_location=device,
    weights_only=False
)

classes = checkpoint["classes"]

model = models.resnet18(weights=None)
model.fc = nn.Linear(model.fc.in_features, 2)

model.load_state_dict(checkpoint["model_state_dict"])
model.to(device)
model.eval()

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

image_path = input("Enter image path: ").strip()

if not os.path.isfile(image_path):
    print("Image not found.")
    raise SystemExit(1)

image = Image.open(image_path).convert("RGB")

tensor = transform(image).unsqueeze(0).to(device)

with torch.no_grad():
    output = model(tensor)
    probabilities = torch.softmax(output, dim=1)

fake_index = classes.index("fake")
real_index = classes.index("real")

fake_probability = probabilities[0][fake_index].item() * 100
real_probability = probabilities[0][real_index].item() * 100

prediction_index = probabilities.argmax(dim=1).item()
prediction = classes[prediction_index]

print()
print("==============================")
print(" GENERAL AI IMAGE DETECTOR")
print("==============================")
print(f"Prediction       : {prediction.upper()}")
print(f"Fake probability : {fake_probability:.2f}%")
print(f"Real probability : {real_probability:.2f}%")
print("==============================")

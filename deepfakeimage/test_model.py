import os
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

MODEL_PATH = "models/deepfake_detector.pth"

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

if not os.path.exists(image_path):
    print("Image not found.")
    exit()

image = Image.open(image_path).convert("RGB")

image_tensor = transform(image)
image_tensor = image_tensor.unsqueeze(0).to(device)

with torch.no_grad():
    output = model(image_tensor)

    probabilities = torch.softmax(output, dim=1)

    confidence, prediction = torch.max(probabilities, 1)

label = classes[prediction.item()]
confidence = confidence.item() * 100

print("\n==============================")
print("DEEPFAKE DETECTION RESULT")
print("==============================")

print(f"Prediction : {label.upper()}")
print(f"Confidence : {confidence:.2f}%")
print("==============================")

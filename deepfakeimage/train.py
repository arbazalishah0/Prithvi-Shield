import os
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms, models

# =========================
# SETTINGS
# =========================

TRAIN_DIR = "training/dataset/train"
VALID_DIR = "training/dataset/validation"

BATCH_SIZE = 32
IMAGE_SIZE = 224
EPOCHS = 10
LEARNING_RATE = 0.0001

MODEL_PATH = "models/deepfake_detector.pth"

# =========================
# DEVICE
# =========================

if torch.backends.mps.is_available():
    device = torch.device("mps")
    print("Using Apple MPS GPU")
elif torch.cuda.is_available():
    device = torch.device("cuda")
    print("Using NVIDIA GPU")
else:
    device = torch.device("cpu")
    print("Using CPU")

# =========================
# IMAGE TRANSFORMS
# =========================

train_transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(10),
    transforms.ColorJitter(
        brightness=0.2,
        contrast=0.2,
        saturation=0.2
    ),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

valid_transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

# =========================
# DATASETS
# =========================

train_dataset = datasets.ImageFolder(
    TRAIN_DIR,
    transform=train_transform
)

valid_dataset = datasets.ImageFolder(
    VALID_DIR,
    transform=valid_transform
)

print("Classes:", train_dataset.classes)
print("Training images:", len(train_dataset))
print("Validation images:", len(valid_dataset))

train_loader = DataLoader(
    train_dataset,
    batch_size=BATCH_SIZE,
    shuffle=True,
    num_workers=0
)

valid_loader = DataLoader(
    valid_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=0
)

# =========================
# MODEL
# =========================

model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)

# Replace final layer for REAL / FAKE
model.fc = nn.Linear(model.fc.in_features, 2)

model = model.to(device)

# =========================
# LOSS + OPTIMIZER
# =========================

criterion = nn.CrossEntropyLoss()

optimizer = torch.optim.AdamW(
    model.parameters(),
    lr=LEARNING_RATE
)

# =========================
# TRAINING
# =========================

best_accuracy = 0.0

for epoch in range(EPOCHS):

    print(f"\nEpoch {epoch + 1}/{EPOCHS}")

    # ---------------------
    # TRAIN
    # ---------------------

    model.train()

    running_loss = 0.0
    correct = 0
    total = 0

    for images, labels in train_loader:

        images = images.to(device)
        labels = labels.to(device)

        optimizer.zero_grad()

        outputs = model(images)

        loss = criterion(outputs, labels)

        loss.backward()

        optimizer.step()

        running_loss += loss.item()

        _, predicted = torch.max(outputs, 1)

        total += labels.size(0)

        correct += (predicted == labels).sum().item()

    train_accuracy = 100 * correct / total

    # ---------------------
    # VALIDATION
    # ---------------------

    model.eval()

    valid_correct = 0
    valid_total = 0
    valid_loss = 0.0

    with torch.no_grad():

        for images, labels in valid_loader:

            images = images.to(device)
            labels = labels.to(device)

            outputs = model(images)

            loss = criterion(outputs, labels)

            valid_loss += loss.item()

            _, predicted = torch.max(outputs, 1)

            valid_total += labels.size(0)

            valid_correct += (
                predicted == labels
            ).sum().item()

    valid_accuracy = 100 * valid_correct / valid_total

    print(
        f"Train Loss: {running_loss / len(train_loader):.4f}"
    )

    print(
        f"Train Accuracy: {train_accuracy:.2f}%"
    )

    print(
        f"Validation Loss: {valid_loss / len(valid_loader):.4f}"
    )

    print(
        f"Validation Accuracy: {valid_accuracy:.2f}%"
    )

    # ---------------------
    # SAVE BEST MODEL
    # ---------------------

    if valid_accuracy > best_accuracy:

        best_accuracy = valid_accuracy

        os.makedirs("models", exist_ok=True)

        torch.save(
            {
                "model_state_dict": model.state_dict(),
                "classes": train_dataset.classes,
                "image_size": IMAGE_SIZE
            },
            MODEL_PATH
        )

        print(
            f"✓ Best model saved: {MODEL_PATH}"
        )

print("\n============================")
print("TRAINING COMPLETE")
print("============================")
print(f"Best validation accuracy: {best_accuracy:.2f}%")
print(f"Model saved to: {MODEL_PATH}")

import os
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms, models

TRAIN_DIR = "training/cifake_dataset/train"
VALID_DIR = "training/cifake_dataset/validation"

BATCH_SIZE = 32
IMAGE_SIZE = 224
EPOCHS = 10
LEARNING_RATE = 0.0001

MODEL_PATH = "models/general_ai_detector.pth"


def get_device():
    if torch.backends.mps.is_available():
        print("Using Apple MPS GPU")
        return torch.device("mps")

    print("Using CPU")
    return torch.device("cpu")


device = get_device()


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


model = models.resnet18(
    weights=models.ResNet18_Weights.DEFAULT
)

model.fc = nn.Linear(
    model.fc.in_features,
    2
)

model = model.to(device)


criterion = nn.CrossEntropyLoss()

optimizer = torch.optim.AdamW(
    model.parameters(),
    lr=LEARNING_RATE
)


best_accuracy = 0.0

for epoch in range(EPOCHS):

    print(f"\nEpoch {epoch + 1}/{EPOCHS}")

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

        predictions = outputs.argmax(dim=1)

        total += labels.size(0)
        correct += (predictions == labels).sum().item()

    train_accuracy = 100 * correct / total


    model.eval()

    validation_loss = 0.0
    validation_correct = 0
    validation_total = 0

    with torch.no_grad():

        for images, labels in valid_loader:

            images = images.to(device)
            labels = labels.to(device)

            outputs = model(images)

            loss = criterion(outputs, labels)

            validation_loss += loss.item()

            predictions = outputs.argmax(dim=1)

            validation_total += labels.size(0)
            validation_correct += (
                predictions == labels
            ).sum().item()

    validation_accuracy = (
        100 * validation_correct / validation_total
    )


    print(
        f"Train Loss: "
        f"{running_loss / len(train_loader):.4f}"
    )

    print(
        f"Train Accuracy: "
        f"{train_accuracy:.2f}%"
    )

    print(
        f"Validation Loss: "
        f"{validation_loss / len(valid_loader):.4f}"
    )

    print(
        f"Validation Accuracy: "
        f"{validation_accuracy:.2f}%"
    )


    if validation_accuracy > best_accuracy:

        best_accuracy = validation_accuracy

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
            f"✓ Saved best model to {MODEL_PATH}"
        )


print("\n==============================")
print("GENERAL AI DETECTOR COMPLETE")
print("==============================")
print(
    f"Best validation accuracy: "
    f"{best_accuracy:.2f}%"
)
print(f"Model: {MODEL_PATH}")

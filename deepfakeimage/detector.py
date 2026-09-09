import torch
import torch.nn as nn
from torchvision import models


def create_model():
    model = models.resnet18(weights="DEFAULT")

    num_features = model.fc.in_features

    model.fc = nn.Linear(num_features, 2)

    return model


def get_device():
    if torch.backends.mps.is_available():
        return torch.device("mps")

    return torch.device("cpu")

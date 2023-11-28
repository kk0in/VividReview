from torchvision import datasets, transforms
from torch.utils.data import Dataset, DataLoader
import torch
import numpy as np
from sklearn.preprocessing import StandardScaler
import pandas as pd
import random

import os
import cv2
import pickle
from .augment import augment_tensor 

def load_data(dirname, filename):
    if os.path.exists(dirname+f'{filename}.pkl'):
        with open(dirname+f'{filename}.pkl', 'rb') as f:
            data = pickle.load(f)
    else:
        data = pd.read_csv(dirname+f'{filename}.csv', header=None, engine="pyarrow").astype(float).values
    return data

class CustomDataset(Dataset):
    def __init__(self, X, Y, window, scaler, augment=False):
        self.X = torch.tensor(X, dtype=torch.float32)
        self.Y = torch.tensor(Y, dtype=torch.int64)
        self.augment = augment
        self.scaler = scaler
        assert len(self.X)==len(self.Y), f"{len(self.X)} != {len(self.Y)}"
    
    def __len__(self):
        return len(self.Y)
    
    def __getitem__(self, index):
        y = self.Y[index]
        x = self.X[index]
        
        if self.augment:
            if random.random() < 0.3:
                x = augment_tensor(x)
        
        x = self.scaler.transform(x)
        x = torch.tensor(x, dtype=torch.float32)
        return x, y

class BaseDataLoader():
    def __init__(self, data_path, scaler_dir, batch_size=256, shuffle=True, window=8, num_workers=8, augment=False):
        scaler = StandardScaler()
        Y = load_data(data_path['trainY']).reshape(-1)
        X = load_data(data_path['trainX']).reshape((len(Y)*window, -1))
        scaler.fit(X)
        X = X.reshape((len(Y), window, -1))
        train_dataset = CustomDataset(X, Y, window, scaler, augment)
        self.train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=shuffle, num_workers=num_workers)
        
        Y = load_data(data_path['valY']).reshape(-1)
        X = load_data(data_path['valX']).reshape((len(Y), window, -1))
        val_dataset = CustomDataset(X, Y, window, scaler, augment)
        self.val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=num_workers)
        
        Y = load_data(data_path['testY']).reshape(-1)
        X = load_data(data_path['testX']).reshape((len(Y), window, -1))
        test_dataset = CustomDataset(X, Y, window, scaler, augment)
        self.test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=num_workers)
        self.scaler = scaler
    

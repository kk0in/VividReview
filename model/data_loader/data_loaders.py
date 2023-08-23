from torchvision import datasets, transforms
from torch.utils.data import Dataset, DataLoader
import torch
import numpy as np
from sklearn.preprocessing import StandardScaler
import pandas as pd
import random
import joblib
from datetime import datetime

# from .feature import extract_feature


class CustomDataset(Dataset):
    def __init__(self, X_fe, Y, window, scaler):
        self.X_fe = torch.tensor(X_fe, dtype=torch.float32)
        self.Y = torch.tensor(Y, dtype=torch.int64).view(-1)
        length = len(self.Y)
        
        self.X_fe = self.X_fe.view((length, window, -1))
        
        self.scaler = scaler
        assert len(self.X_fe)==len(self.Y), f"{len(self.X_fe)} != {len(self.Y)}"
    
    def __len__(self):
        return len(self.Y)
    
    def __getitem__(self, index):
        y = self.Y[index]
        x = self.X_fe[index]
        
        x = self.scaler.transform(x)
        x = torch.tensor(x, dtype=torch.float32)
        return x, y

class FullDataLoader():
    def __init__(self, data_dir, scaler_dir, batch_size=256, shuffle=True, window=8, num_workers=8):
        scaler = StandardScaler()
        
        X_fe = pd.read_csv(data_dir+'X_train.csv', header=None, engine="pyarrow").astype(float).values
        scaler.fit(X_fe)
        Y = pd.read_csv(data_dir+'Y_train.csv', header=None, engine="pyarrow").astype(float).values
        train_dataset = CustomDataset(X_fe, Y, window, scaler)
        self.train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=shuffle, num_workers=num_workers)
        
        X_fe = pd.read_csv(data_dir+'X_val.csv', header=None, engine="pyarrow").astype(float).values
        Y = pd.read_csv(data_dir+'Y_val.csv', header=None, engine="pyarrow").astype(float).values
        val_dataset = CustomDataset(X_fe, Y, window, scaler)
        self.val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=num_workers)
        
        X_fe = pd.read_csv(data_dir+'X_test.csv', header=None, engine="pyarrow").astype(float).values
        Y = pd.read_csv(data_dir+'Y_test.csv', header=None, engine="pyarrow").astype(float).values
        test_dataset = CustomDataset(X_fe, Y, window, scaler)
        self.test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=num_workers)
        
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        scaler_save = scaler_dir+f"scaler_{timestamp}.joblib"
        joblib.dump(scaler, scaler_save)




    
        
    
    
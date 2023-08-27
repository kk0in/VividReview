from sklearn.preprocessing import StandardScaler
from datetime import datetime
import joblib
from glob import glob
import pandas as pd
import os
import shutil
from collections import defaultdict
import random
import numpy as np
import pickle
import math

DATA_PATH = "./assets/train/overlap/keypoints/"
SAMPLED_PATH = "./assets/train/sampled/keypoints/"
os.makedirs(SAMPLED_PATH, exist_ok=True)
    
if os.path.exists(DATA_PATH+"X_train.pkl"):
    with open(DATA_PATH+"X_train.pkl", 'rb') as f:
        X_train = pickle.load(f)
else:
    X_train = pd.read_csv(DATA_PATH+"X_train.csv", engine='pyarrow', header=None).values
Y_train = pd.read_csv(DATA_PATH+"Y_train.csv", engine='pyarrow', header=None).values

X_train = X_train.reshape((-1, 8, 96))
Y_train = Y_train.reshape((-1))

cat_samples = defaultdict(list)

for x, y in zip(X_train, Y_train):
    cat_samples[y].append(x)
sample_criteria = 0
for cat, samples in cat_samples.items():
    print(f"{cat}: {len(samples)}")
    sample_criteria = max(sample_criteria, len(samples))

print(f"targetting {sample_criteria}")

full = []
labels = []
for cat, samples in cat_samples.items():
    if len(samples) >= sample_criteria:
        full += samples[:sample_criteria]
    else:
        multiply = math.ceil(sample_criteria/len(samples))
        full += (samples*multiply)[:sample_criteria]
    labels += [cat]*sample_criteria


cat_samples = defaultdict(list)
for x, y in zip(full, labels):
    cat_samples[y].append(x)
for cat, samples in cat_samples.items():
    print(f"{cat}: {len(samples)}")
X_train = np.array(full).reshape((-1, 96))
Y_train = np.array(labels).reshape((-1, 1))

with open(SAMPLED_PATH+"X_train.pkl", 'wb') as f:
    pickle.dump(X_train, f)
with open(SAMPLED_PATH+"Y_train.pkl", 'wb') as f:
    pickle.dump(Y_train, f)
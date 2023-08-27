from datetime import datetime
import joblib
import numpy as np
import torch
from glob import glob
import pandas as pd
import os
import parmap
import math
import shutil
import random
import cv2
from tqdm import tqdm
import pickle
from collections import defaultdict
from functools import partial

from kp2feature import extract_feature


DATA_PATH = "./assets/train/overlap/keypoints/"
AUGMENTED_PATH = "./assets/train/augmented/"
PROCESSES = 30
FRAMES = 8
os.makedirs(AUGMENTED_PATH, exist_ok=True)

def parse_line(start_idx):
    concat = []
    for i in range(start_idx, start_idx+FRAMES):
        line = lines[i]
        line = [float(l) for l in line.split(",")]
        concat += line
    return concat


print("Loading Data")

with open(DATA_PATH+"X_train.csv", "r") as f:
    lines = f.readlines()
    lines = [l.replace("\n", "") for l in lines]
    train_X = parmap.map(parse_line, range(0, len(lines), FRAMES), pm_pbar=True, pm_processes=PROCESSES, pm_chunksize=1000)
sample_count = len(train_X)
train_X = np.array(train_X).reshape(sample_count, FRAMES, -1)

with open(DATA_PATH+"Y_train.csv", "r") as f:
    lines = f.readlines()
    lines = [l.replace("\n", "") for l in lines]
    train_Y = [int(l) for l in lines]
train_Y = np.array(train_Y)

height = 1200
width = 2000
deformation_ratio = 0.3

cat_samples = defaultdict(list)

for x, y in zip(train_X, train_Y):
    cat_samples[y].append(x)

for cat, samples in cat_samples.items():
    print(f"{cat}: {len(samples)}")

sample_criteria = 20000
target_samples = 40000



def get_perspective():
    src_points = np.float32([[0, 0], [width, 0], [0, height], [width, height]])
    x1 = random.randint(0, width*deformation_ratio)
    x2 = random.randint(0, width*deformation_ratio)
    x3 = random.randint(0, width*deformation_ratio)
    x4 = random.randint(0, width*deformation_ratio)
    y1 = random.randint(0, height*deformation_ratio)
    y2 = random.randint(0, height*deformation_ratio)
    y3 = random.randint(0, height*deformation_ratio)
    y4 = random.randint(0, height*deformation_ratio)
    dst_points = np.float32([[x1, y1], [width - x2, y2], [x3, height - y3], [width - x4, height - y4]])
    perspective_matrix = cv2.getPerspectiveTransform(src_points, dst_points)
    return perspective_matrix

def _augment(sample, times):
    result = []
    result += extract_feature(sample)
    for _ in range(times):
        perspective_matrix = get_perspective()
        tranformed = []
        for frame in sample:
            points_2d = np.array(np.array_split(frame, len(frame)/2))
            points_3d = np.hstack((points_2d, np.ones((points_2d.shape[0], 1))))
            transformed_3d = np.dot(perspective_matrix, points_3d.T).T
            transformed_2d = transformed_3d[:, :2] / transformed_3d[:, 2:]
            tranformed.append(transformed_2d.flatten())
        features = extract_feature(tranformed)
        result += features
    return result


full = []
labels = []
for cat, samples in cat_samples.items():
    if len(samples) > sample_criteria:
        original_samples = random.sample(samples, sample_criteria)
        fn = partial(_augment, times=math.ceil(target_samples // sample_criteria)-1)
        results = parmap.map(fn, original_samples, pm_pbar=True, pm_processes=20, pm_chunksize=50)
        results = [item for sublist in results for item in sublist] ## 8 frame unroll
        assert len(results) == 8*target_samples, f"{len(results)}"
        full += results
    else:
        original_samples = samples
        fn = partial(_augment, times= math.ceil(target_samples / len(original_samples))-1)
        results = parmap.map(fn, original_samples, pm_pbar=True, pm_processes=20, pm_chunksize=50)
        results = [item for sublist in results for item in sublist] ## 8 frame unroll
        results = random.sample(results, 8*target_samples)
        full += results
        
    labels += [cat]*target_samples


assert len(full)//8 == len(labels), f"{len(full)//8} != {len(labels)}"

with open(AUGMENTED_PATH+"X_train.pkl", 'wb') as f:
    pickle.dump(np.array(full), f)

train_Y = np.array(labels)
pd.DataFrame(train_Y).to_csv(AUGMENTED_PATH+"Y_train.csv", index=False, header=None)
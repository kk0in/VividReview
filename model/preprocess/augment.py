from datetime import datetime
import joblib
import numpy as np
import torch
from glob import glob
import pandas as pd
import os
import parmap
import shutil
import random
import cv2
from tqdm import tqdm

from kp2feature import extract_feature


DATA_PATH = "./assets/overlap/keypoints/"
AUGMENTED_PATH = "./assets/augmented/"
PROCESSES = 30
FRAMES = 8
AUGMENT_RATIO = 3
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
    train_X = parmap.map(parse_line, range(0, len(lines), FRAMES), pm_pbar=True, pm_processes=PROCESSES)
sample_count = len(train_X)
train_X = np.array(train_X).reshape(sample_count, FRAMES, -1)

height = 1100
width = 1600
deformation_ratio = 0.1

def get_perspective():
    src_points = np.float32([[0, 0], [width, 0], [0, height], [width, height]])
    x1 = random.randint(-width*deformation_ratio, width*deformation_ratio)
    x2 = random.randint(-width*deformation_ratio, width*deformation_ratio)
    x3 = random.randint(-width*deformation_ratio, width*deformation_ratio)
    x4 = random.randint(-width*deformation_ratio, width*deformation_ratio)
    y1 = random.randint(-height*deformation_ratio, height*deformation_ratio)
    y2 = random.randint(-height*deformation_ratio, height*deformation_ratio)
    y3 = random.randint(-height*deformation_ratio, height*deformation_ratio)
    y4 = random.randint(-height*deformation_ratio, height*deformation_ratio)
    dst_points = np.float32([[x1, y1], [width - x2, y2], [x3, height - y3], [width - x4, height - y4]])
    perspective_matrix = cv2.getPerspectiveTransform(src_points, dst_points)
    return perspective_matrix

def _augment(sample):
    result = []
    result += extract_feature(sample)
    for _ in range(AUGMENT_RATIO):
        perspective_matrix = get_perspective()
        tranformed = []
        for frame in sample:
            points_2d = np.array(np.array_split(frame, len(frame)/2))
            points_3d = np.hstack((points_2d, np.ones((points_2d.shape[0], 1))))
            transformed_3d = np.dot(perspective_matrix, points_3d.T).T
            transformed_2d = transformed_3d[:, :2] / transformed_3d[:, 2:]
            tranformed.append(transformed_2d.flatten())
        features = extract_feature(tranformed)
        result+=features
    return result
results = parmap.map(_augment, train_X, pm_pbar=True, pm_processes=PROCESSES)
results = [item for sublist in results for item in sublist]

pd.DataFrame(results).to_csv(AUGMENTED_PATH+"X_train.csv", index=False, header=None)


with open(DATA_PATH+"Y_train.csv", "r") as f:
    lines = f.readlines()
    lines = [l.replace("\n", "") for l in lines]
    train_Y = [int(l) for l in lines]
train_Y = np.array(train_Y)
train_Y = np.repeat(train_Y, AUGMENT_RATIO+1).reshape((-1, 1))
pd.DataFrame(train_Y).to_csv(AUGMENTED_PATH+"Y_train.csv", index=False, header=None)
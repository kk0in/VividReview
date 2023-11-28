import argparse
import collections
import torch
import numpy as np
from parse_config import ConfigParser
import json


from train import train_model

from .preprocess import run_train_pipe


def run_train(input_video:str, input_label_csv:str, prefill_paths=None):
    
    with open("train_config.json", "r") as f:
        config_obj = json.load(f)
        
    ## if prefill, fill pose_dir folder with existing videos and labels for train data.
    if prefill_paths:
        prefill(prefill_paths, config_obj['pose_folder'])
    
    ## all extracted pose data (.json, .csv) are stored in pose_foler
    pose_folder = config_obj['pose_folder']
    csv_path_dict = run_train_pipe(input_video, input_label_csv, pose_folder, 60, 8)
    
    data_path = {
        "trainX": csv_path_dict["train"][0],
        "trainY": csv_path_dict["train"][1],
        "valX": csv_path_dict["val"][0],
        "valY": csv_path_dict["val"][1],
        "testX": csv_path_dict["test"][0],
        "testY": csv_path_dict["test"][1]
    }
    config_obj['data_loader']['args']['data_path'] = data_path
    config = ConfigParser(config_obj)
    
    scaler_path, checkpoint_path = train_model(config)
    return scaler_path, checkpoint_path


def prefill(video_folder, pose_folder):
    ## TODO: fill pose_folder with existing videos and labels for train data.
    pass
    
if __name__ == '__main__':
    
    input_video = "~~.mp4"
    input_label_csv = "~~.csv"

    run_train(input_video, input_label_csv)

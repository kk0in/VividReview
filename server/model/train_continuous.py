import argparse
import collections
import torch
import numpy as np
from .parse_config import ConfigParser
import json
from glob import glob
import os


from .train import train_model

from .preprocess import run_train_pipe, run_prefill_pipe

CURRENT_FOLDER = os.path.dirname(os.path.realpath(__file__))

def run_train(input_video:str, input_label_csv:str):
    
    with open(os.path.join(CURRENT_FOLDER, "train_config.json"), "r") as f:
        config_obj = json.load(f)
    pose_folder = config_obj['pose_dir']
    
    ## prefill pose_folder folder with existing videos and labels for train data.
    ## Early exit if pose_folder is already prefilled.
    print("Prefilling pose_folder...")
    prefill(pose_folder)
    
    ## all extracted pose data (.json, .csv) are stored in pose_foler
    
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


def prefill(pose_folder):
    csv_list = sorted(glob("/data/samsung/sec/RAW/*/*.csv"))
    mp4_list = sorted(glob("/data/samsung/sec/RAW/*/*.mp4"))
    for prefill_csv, prefill_mp4 in zip(csv_list, mp4_list):
        filename = prefill_csv.split("/")[-1].split(".")[0]
        if not os.path.exists(os.path.join(pose_folder, filename+".json")):
            print(f"Prefilling {filename} in {pose_folder}...")
            run_prefill_pipe(prefill_mp4, prefill_csv, pose_folder, 60, 8)


    
if __name__ == '__main__':
    
    input_video = "~~.mp4"
    input_label_csv = "~~.csv"

    run_train(input_video, input_label_csv)

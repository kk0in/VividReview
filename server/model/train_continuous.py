import argparse
import collections
import torch
import numpy as np
from .parse_config import ConfigParser
import json
from glob import glob
import os
from typing import List


from .train import train_model

from .preprocess import run_train_pipe, run_prefill_pipe

CURRENT_FOLDER = os.path.dirname(os.path.realpath(__file__))



def run_train(input_video_list:List[str], input_label_csv_list:List[str], prefill_folder:str="/data/samsung/sec/RAW"):
    """
    Train the model using the provided input video and label CSV file.

    :param input_video_list: Path to the input video file.
    :type input_video_list: List[str]
    :param input_label_csv_list: Path to the label CSV file.
    :type input_label_csv_list: List[str]
    :param prefill_folder: Path to the prefill folder, defaults to "/data/samsung/sec/RAW".
    :type prefill_folder: str, optional
    :return: A tuple containing the scaler path and checkpoint path.
    :rtype: tuple
    """
    
    with open(os.path.join(CURRENT_FOLDER, "train_config.json"), "r") as f:
        config_obj = json.load(f)
    pose_folder = config_obj['pose_dir']
    
    ## prefill pose_folder folder with existing videos and labels for train data.
    ## Early exit if pose_folder is already prefilled.
    print("Prefilling pose_folder...")
    prefill(prefill_folder, pose_folder)
    print("Prefilling done.")
    
    ## all extracted pose data (.json, .csv) are stored in pose_foler
    
    for input_video, input_label_csv in zip(input_video_list, input_label_csv_list):
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





def prefill(prefill_folder: str, pose_folder: str) -> None:
    """
    This function pre-fills the pose folder with data from the pre-fill folder.

    :param prefill_folder: The path to the pre-fill folder.
    :type prefill_folder: str
    :param pose_folder: The path to the pose folder.
    :type pose_folder: str
    """
    
    csv_list = sorted(glob(os.path.join(prefill_folder, "**/*.csv"), recursive=True))
    mp4_list = sorted(glob(os.path.join(prefill_folder, "**/*.mp4"), recursive=True))
    
    for prefill_csv, prefill_mp4 in zip(csv_list, mp4_list):
        filename = prefill_csv.split("/")[-1].split(".")[0]
        if not os.path.exists(os.path.join(pose_folder, filename+".json")):
            print(f"Prefilling {filename} in {pose_folder}...")
            run_prefill_pipe(prefill_mp4, prefill_csv, pose_folder, 60, 8)


    
# if __name__ == '__main__':
    
#     input_video = "~~.mp4"
#     input_label_csv = "~~.csv"

#     run_train(input_video, input_label_csv)

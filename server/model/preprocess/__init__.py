from .inference_feature import run_feature_extraction
from .train_feature import train_extract_feature
from .pose_estimation import rtmpose
from .json_trim import run_json_trim
from .overlap import run_overlap
import os
from typing import Tuple, Dict, List
import json
import shutil


base_path = os.path.dirname(os.path.realpath(__file__))
HOME = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))



def run_inference_pipe(input_video:str)->Tuple[str, str]:
    """Run Pipeline for single video

    :param input_video: path to input video
    :type input_video: str
    
    :return: json_path, csv_path
    :rtype: Tuple[str, str]
    """
    
    
    json_file = rtmpose(input_video, HOME, "cuda:0")
    feature_csv_file = run_feature_extraction(json_file, HOME)
    return json_file, feature_csv_file


def run_prefill_pipe(input_video:str, input_labels:str, pose_folder:str, frame_rate:int, window_size:int):
    """prefill pose extractions

    :param input_video: _description_
    :type input_video: str
    :param input_labels: _description_
    :type input_labels: str
    :param pose_folder: _description_
    :type pose_folder: str
    :param frame_rate: _description_
    :type frame_rate: int
    :param window_size: _description_
    :type window_size: int
    """
    
    pose_cache = os.path.join(HOME, "cache_pose")
    
    ## extract pose from new single video
    print("Extracting pose from video...")
    shutil.rmtree(pose_cache, ignore_errors=True)
    os.makedirs(pose_cache, exist_ok=True)
    json_file = rtmpose(
        i_path=input_video, 
        o_path=pose_cache, 
        device_="cuda:0"
    )
    
    # copy json file, label to pose_folder
    print("Copying json file, label to pose_folder...")
    os.makedirs(pose_folder, exist_ok=True)
    filename = json_file.split("/")[-1]
    shutil.copy(json_file, os.path.join(pose_folder, filename+".json"))
    shutil.copy(input_labels, os.path.join(pose_folder, filename+".csv"))
    

def run_train_pipe(input_video:str, input_labels:str, pose_folder:str, frame_rate:int, window_size:int)->Dict[str, Tuple[str, str, str]]:
    """Run Pipeline for single video

    :param input_video: path to input video
    :type input_video: str
    :param input_labels: path to input labels
    :type input_labels: str
    :param pose_folder: path to pose folder
    :type pose_folder: str
    :param frame_rate: frame rate of the video
    :type frame_rate: int
    :param window_size: window size
    :type window_size: int
    :return: csv_path_dict
    :rtype: Dict[str, Tuple[str, str, str]]
    """
    
    split_cache = os.path.join(HOME, "cache_split")
    pose_cache = os.path.join(HOME, "cache_pose")
    feature_cache = os.path.join(HOME, "cache_feature")
    
    
    # extract pose from new single video
    print("Extracting pose from video...")
    shutil.rmtree(pose_cache, ignore_errors=True)
    os.makedirs(pose_cache, exist_ok=True)
    json_file = rtmpose(
        i_path=input_video, 
        o_path=pose_cache, 
        device_="cuda"
    )
    
    # copy json file, label to pose_folder
    print("Copying json file, label to pose_folder...")
    os.makedirs(pose_folder, exist_ok=True)
    filename = json_file.split("/")[-1].split(".")[0]
    shutil.copy(json_file, os.path.join(pose_folder, filename+".json"))
    shutil.copy(input_labels, os.path.join(pose_folder, filename+".csv"))
    
    
    print("Trimming json file...")
    shutil.rmtree(split_cache, ignore_errors=True)
    os.makedirs(split_cache, exist_ok=True)
    run_json_trim(
        input_path=pose_folder,
        output_dir=split_cache, 
        frame_rate=frame_rate
    )
    
    
    # extract feature and split into train/val/test
    print("Extracting feature and split into train/val/test...")
    shutil.rmtree(feature_cache, ignore_errors=True)
    os.makedirs(feature_cache, exist_ok=True)
    csv_path_dict = train_extract_feature(
        json_folder=split_cache, 
        target_folder=feature_cache
    )
    
    for split in ["train", "val", "test"]:
        print(f"Running overlap... {split}")
        original_X_csv = csv_path_dict[split][0]
        original_Y_csv = csv_path_dict[split][1]
        run_overlap(
            prev_X_path=original_X_csv,
            prev_Y_path=original_Y_csv,
            new_X_path= original_X_csv.replace(".csv", "_overlap.csv"),
            new_Y_path= original_Y_csv.replace(".csv", "_overlap.csv"),
            window_size=window_size,
            overlap=6
        )
    
        csv_path_dict[split] = [
            original_X_csv.replace(".csv", "_overlap.csv"), 
            original_Y_csv.replace(".csv", "_overlap.csv"), 
            csv_path_dict[split][2]
        ]
    
    
    
    return csv_path_dict
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
    
    split_cache = os.path.join(HOME, "split_cache")
    pose_cache = os.path.join(HOME, "pose_cache")
    feature_cache = os.path.join(HOME, "feature_cache")
    new_X_csv = os.path.join(feature_cache, "overlapX.csv")
    new_Y_csv = os.path.join(feature_cache, "overlapY.csv")
    
    
    ## extract pose from new single video
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
    filename = json_file.split("/")[-1]
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
    
    
    ## extract feature and split into train/val/test
    print("Extracting feature and split into train/val/test...")
    shutil.rmtree(feature_cache, ignore_errors=True)
    os.makedirs(feature_cache, exist_ok=True)
    csv_path_dict = train_extract_feature(
        json_file=split_cache, 
        output_dir=feature_cache
    )

    print("Running overlap...")
    run_overlap(
        prev_X_path=csv_path_dict["train"][0],
        prev_Y_path=csv_path_dict["train"][1],
        new_X_path= new_X_csv,
        new_Y_path= new_Y_csv,
        window_size=window_size,
        overlap=6
    )
    
    csv_path_dict["train"] = [new_X_csv, new_Y_csv, csv_path_dict["train"][2]]
    
    return csv_path_dict
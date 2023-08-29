from .inference_feature import run_feature_extraction
from .pose_estimation import rtmpose
from .json_trim import run_json_trim
from .overlap import run_overlap
import os
from typing import Tuple
import json


base_path = os.path.dirname(os.path.realpath(__file__))
HOME = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))


def run_pipe(input_video:str, frame_rate:int, window_size:int, inference:bool=True)->Tuple[str, str]:
    """Run Pipeline for single video

    :param input_video: path to input video
    :type input_video: str
    :param frame_rate: frame rate of the video
    :type frame_rate: int
    :param window_size: window size
    :type window_size: int
    :param inference: inference mode, defaults to True
    :type inference: bool, optional
    :return: json_path, csv_path
    :rtype: Tuple[str, str]
    """
    
    # Open and read the JSON file
    
    name = os.path.basename(input_video)

    rtm_pose_path = base_path + f"/assets/{name}/rtm_pose/"
    feature_path = base_path + f"/assets/{name}/feature/"
    # overlap_path = base_path + f"/assets/{name}/overlap/"
    
    # overlap_count = 7 if inference else 6
    # val_size = 0 if inference else 0.1
    # test_size = 0 if inference else 0.1
    
    json_file = rtmpose(input_video, HOME, "cuda:0")
    
    # run_json_trim(rtm_pose_path, json_trim_path, frame_rate)
    
    feature_csv_file = run_feature_extraction(json_file, HOME)
    # run_keypoint_extraction()
    
    # run_overlap(feature_path, overlap_path, window_size, overlap_count, val_size, test_size)
    
    return json_file, feature_csv_file
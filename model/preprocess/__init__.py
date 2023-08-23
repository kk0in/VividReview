from .feature import run_feature_extraction
from .keypoint import run_keypoint_extraction
from .pose_estimation import run_pose_estimation
from .json_trim import run_json_trim
from .overlap import run_overlap
import os
import json


base_path = os.path.dirname(os.path.realpath(__file__))


def run_pipe(input_video, frame_rate, frame_per_data, inference=True):
    """_summary_
        Run Pipeline for single video
        
    :param input_video: _description_
    :type input_video: str
    :param inference: is_inferenece, defaults to True
    :type inference: bool, optional
    :return: output csv path
    :rtype: str
    """
    
    # Open and read the JSON file
    
    name = os.path.basename(input_video)
    rtm_pose_path = base_path + f"/assets/{name}/rtm_pose/"
    json_trim_path = base_path + f"/assets/{name}/json/"
    feature_path = base_path + f"/assets/{name}/feature/"
    # overlap_path = base_path + f"/assets/{name}/overlap/"
    
    # overlap_count = 7 if inference else 6
    # val_size = 0 if inference else 0.1
    # test_size = 0 if inference else 0.1
    
    run_pose_estimation(input_video, rtm_pose_path)
    run_json_trim(rtm_pose_path, json_trim_path, frame_rate)
    csv_path = run_feature_extraction(json_trim_path, feature_path)
    # run_keypoint_extraction()
    
    # run_overlap(feature_path, overlap_path, frame_per_data, overlap_count, val_size, test_size)
    
    return csv_path
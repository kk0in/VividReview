import numpy as np
import random
import cv2

height = 1200
width = 2000
deformation_ratio = 0.2

def get_perspective():
    src_points = np.float32([[0, 0], [width, 0], [0, height], [width, height]])
    x = [random.randint(-width*deformation_ratio, width*deformation_ratio) for _ in range(4)]
    y = [random.randint(-height*deformation_ratio, height*deformation_ratio) for _ in range(4)]

    dst_points = np.float32([[x[0], y[0]], [width - x[1], y[1]], [x[2], height - y[2]], [width - x[3], height - y[3]]])
    perspective_matrix = cv2.getPerspectiveTransform(src_points, dst_points)
    return perspective_matrix
        
def augment_tensor(x):
    perspective_matrix = get_perspective()
    original_shape = x.shape
    x = x.flatten()
    points_2d = np.array(np.array_split(x, len(x)/2))
    points_3d = np.hstack((points_2d, np.ones((points_2d.shape[0], 1))))
    transformed_3d = np.dot(perspective_matrix, points_3d.T).T
    transformed_2d = transformed_3d[:, :2] / transformed_3d[:, 2:]
    transformed_2d = transformed_2d.reshape(original_shape)
    return transformed_2d
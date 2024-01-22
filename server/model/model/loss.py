import torch.nn.functional as F
import torch


## Label unbalance weights
WEIGHT = torch.tensor([0.7105757805690662,
                        0.9208940857074752,
                        0.9386862748309124,
                        0.9103621578442664,
                        0.9165834193101114,
                        0.978064548999485,
                        0.9541693733430137,
                        0.6706643593956697])

def cross_entropy(output, target):
    weight = WEIGHT[:len(output[0])].to(output.device)
    return F.cross_entropy(output, target, weight=weight, label_smoothing=0.1)

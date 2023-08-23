import torch.nn.functional as F


def nll_loss(output, target):
    return F.nll_loss(output, target)


def cross_entropy(output, target):
    target = target.view(-1)
    return F.cross_entropy(output, target)

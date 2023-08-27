import torch.nn.functional as F


def nll_loss(output, target):
    return F.nll_loss(output, target)


def cross_entropy(output, target):
    return F.cross_entropy(output, target, label_smoothing=0.1)


def batch_entropy(output, target):
    batch_size, window, _ = output.shape
    return F.cross_entropy(output.view(batch_size*window, -1), target.view(-1), label_smoothing=0.1)
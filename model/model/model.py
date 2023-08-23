import torch.nn as nn
import torch.nn.functional as F


class SimpleNet(nn.Module):
    def __init__(self, input_size=138, output_size=8, linear_layers=0, lstm_hidden=256, dropout_prob=0.3):
        super(SimpleNet, self).__init__()
        
        self.lstm_layers = 1
        self.lstm_hidden = lstm_hidden
        self.lstm_input = 1024
        self.input_size = input_size

        pre_layers = [
            [input_size, 2048],
            [2048, 1024],
        ] + [
            [1024, 1024] for _ in range(linear_layers)
        ] + [
            [1024, self.lstm_input]
        ]

        self.pre = nn.ModuleList([
            nn.Sequential(
                nn.Linear(i, o),
                nn.BatchNorm1d(o),
                nn.GELU(),
                nn.Dropout(p=dropout_prob)
            )
            for i, o in pre_layers
        ])

        self.lstm = nn.LSTM(self.lstm_input, self.lstm_hidden, num_layers=self.lstm_layers, batch_first=True)

        self.last = nn.Sequential(
            nn.Linear(self.lstm_hidden, 256),
            nn.BatchNorm1d(256),
            nn.GELU(),
            nn.Dropout(p=dropout_prob),
            nn.Linear(256, output_size)
        )

    
    def forward(self, x):
        batch_size = x.shape[0]
        x = x.view(-1, self.input_size)
        for layer in self.pre:
            x = layer(x)
        x = x.view(batch_size, -1, self.lstm_input)
        x, _ = self.lstm(x)
        x = self.last(x[:, -1, :].squeeze(1)) 
        return x 
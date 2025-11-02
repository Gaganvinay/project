import torch
import torch.nn as nn
from torch_geometric.nn import SAGEConv

class VendorGraphSAGE(nn.Module):
    def __init__(self, in_channels=4, hidden_channels=32):
        super().__init__()
        self.conv1 = SAGEConv(in_channels, hidden_channels)
        self.conv2 = SAGEConv(hidden_channels, hidden_channels)
        self.lin = nn.Linear(hidden_channels, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x, edge_index):
        x = self.conv1(x, edge_index).relu()
        x = self.conv2(x, edge_index).relu()
        x = self.lin(x)
        return self.sigmoid(x)

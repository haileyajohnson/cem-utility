#ifndef SEDTRANS_INCLUDED
#define SEDTRANS_INCLUDED

#if defined(__cplusplus)
extern "C" {
#endif

#include <stdlib.h>
#include "BeachNode.h"
#include "BeachGrid.h"

void WaveTransformation(struct BeachGrid *grid, double wave_angle, double wave_period, double wave_height);
void GetAvailableSuppy(struct BeachGrid *grid, int ref_pos, double ref_depth, double shelf_slope, double shoreface_slope, double min_depth);
void NetVolumeChange(struct BeachGrid *grid);
void TransportSediment(struct BeachGrid *grid, int ref_pos, double ref_depth, double shelf_slope, double shoreface_slope, double min_depth);
void FixBeach(struct BeachGrid *grid);

#if defined(__cplusplus)
}
#endif

#endif
#include <stdlib.h>
#include <string.h>

#include "utils.h"

// Allocate memory for a 2D matrix as a continuous block.
void **malloc2d(size_t n_rows, size_t n_cols, size_t itemsize)
{
  size_t i;
  void **matrix = malloc(sizeof(char*) * n_rows);
  matrix[0] = malloc(itemsize * n_rows * n_cols);
  for (i = 1; i < n_rows ; i++)
    matrix[i] = (char *)*matrix + i*n_cols * itemsize;

  return matrix;
}

// Free memory allocated with malloc2d.
void free2d(void **mem)
{
  free(mem[0]);
  free(mem);
}

/**
 * Generates a random number equally distributed between zero and one
 * PARAMETERS: none
 * RETURN: random double between zero and one
 */
double RandZeroToOne(void)
{
	return (double)rand() / RAND_MAX;
}

/**
 * Reverses a 1D array of ints
 */
int *reverse(int *array, size_t n_cols)
{
  int *rev = malloc(sizeof(int) * n_cols);
  size_t i;
  for (i = 0; i < n_cols; i++)
  {
    rev[i] = array[n_cols-i-1];
  }

  return rev;
}

/**
 * Shifts a 1D array ofints by offset
 */
int *rotate(int *array, size_t offset, size_t n_cols)
{
  int *rot = malloc(sizeof(int) * n_cols);
  size_t i;
  for (i = 0; i < n_cols-offset; i++)
  {
    rot[i] = array[i+offset];
  }
  for (i = n_cols-offset; i < n_cols; i++)
  {
      rot[i] = array[i-(n_cols-offset)];
  }
  return rot;
}

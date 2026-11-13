"""Deterministic synthetic unit fixtures, not substitutes for NASA data.

Run: python -m unittest discover -s tools/data -p 'test_*.py' -v
"""
import unittest

import numpy as np

from colorbar import Inverter
from invert import OK, dequantise, invert_frame, invert_point, quantise
from layers import DEFAULTS
from sanity import jump_checks, stats
from series import build_series


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.layer = {'units': 'fixture', 'axis_verified': False, 'interp': 'linear',
                      'anchors': [(0, 1), (1, 10)]}
        bar = {'colors': np.array([[255,255,255], [200,140,40], [150,80,10], [90,30,5]], float),
               'positions': np.linspace(0, 1, 4)}
        self.inv = Inverter(self.layer, bar)

    def test_point_equals_grid_with_or_without_base(self):
        for base in (None, .8, 1.0):
            for rgb in ([200,140,40], [120,64,8], [100,100,100], [2,3,2]):
                block = np.array(rgb, np.float32).reshape(1,1,3)
                coverage = np.array([[float(block.max() >= DEFAULTS['brightness_min'])]])
                result = invert_frame(self.inv, block, coverage, DEFAULTS,
                                      base=None if base is None else np.array([[base]]))
                point = invert_point(self.inv, np.array(rgb), base, DEFAULTS)
                self.assertEqual(point[0], float(result['value'][0,0]))
                self.assertEqual(point[1], int(result['flags'][0,0]))
                self.assertAlmostEqual(point[2], float(result['chroma_dist'][0,0]), places=7)

    def test_flagged_grids_are_nodata(self):
        flags = np.array([[0,1,2],[3,4,5]], np.uint8)
        values = np.full(flags.shape, 5.0)
        q = quantise(values, flags, self.layer)
        self.assertTrue(np.array_equal(q == 255, flags != 0))
        decoded = dequantise(q, self.layer)
        self.assertTrue(np.array_equal(np.isnan(decoded), flags != 0))

    def test_series_never_averages_neighbours_into_flagged_cell(self):
        values = np.full((1,90,180), 4.0)
        flags = np.zeros(values.shape, np.uint8)
        flags[0,29,105] = 1
        values[0,29,105] = np.nan
        series = build_series(self.inv, self.layer, [0], {0:{'cairo':np.array([100,100,100])}},
                              values, flags)
        point = series[0]['points'][0]
        self.assertNotEqual(point['flag'], OK)
        self.assertIsNone(point['value'])
        self.assertEqual(point['grid_flag'], 1)
        self.assertIsNone(point['grid_value'])
        self.assertIsNone(point['fine_minus_grid'])

    def test_empty_statistics_are_null(self):
        s = stats([np.nan, np.nan])
        self.assertEqual(s['n_null'], 2)
        for key in ('min','max','mean','p50','p95'):
            self.assertIsNone(s[key])

    def test_jumps_use_individual_neighbours_and_do_not_bridge_nulls(self):
        r = jump_checks([1,10,1], [0,6,12])
        self.assertEqual([x['frame'] for x in r['isolated_two_sided']], [6])
        self.assertEqual(len(r['adjacent_transitions']), 2)
        r = jump_checks([1,4,10], [0,6,12])
        self.assertEqual(len(r['isolated_two_sided']), 0)
        self.assertEqual(len(r['adjacent_transitions']), 1)
        r = jump_checks([1,np.nan,10], [0,6,12])
        self.assertEqual(len(r['adjacent_transitions']), 0)

    def test_diurnal_ordinal_mapping_matches_source_clock(self):
        indices = list(range(0,1801,6))
        self.assertEqual([(j%4)*6 for j in range(301)], [index%24 for index in indices])


if __name__ == '__main__':
    unittest.main()

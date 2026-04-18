# Assignment 3 Performance Summary

| Endpoint | Scenario | Connections | Average | Median | Estimated p95 | Throughput | Error rate | Memory growth | Threshold status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Product discovery | normal | 10 | 24.67 ms | 15 ms | 21.33 ms | 648.43 rps | 0% | 13.83% | pass |
| Product discovery | peak | 25 | 60.15 ms | 37 ms | 53 ms | 672.77 rps | 0% | -22.38% | pass |
| Product discovery | spike | 60 | 141.53 ms | 90 ms | 1391 ms | 676.3 rps | 0% | 0.52% | n/a |
| Product discovery | endurance | 10 | 25.05 ms | 15 ms | 20.67 ms | 649.53 rps | 0% | -9.09% | n/a |
| Search | normal | 10 | 11.42 ms | 7 ms | 9.67 ms | 1368.72 rps | 0% | 22.67% | pass |
| Search | peak | 25 | 27.57 ms | 17 ms | 24 ms | 1453.79 rps | 0% | -35% | pass |
| Search | spike | 60 | 63.12 ms | 39 ms | 56.33 ms | 1509.5 rps | 0% | 5.97% | n/a |
| Search | endurance | 10 | 11.59 ms | 7 ms | 9.67 ms | 1371.82 rps | 0% | 48.53% | n/a |
| Authentication | normal | 10 | 870.58 ms | 511 ms | 2483.67 ms | 18.74 rps | 0% | 61.72% | fail |
| Authentication | peak | 25 | 1692.35 ms | 1370 ms | 2785.67 ms | 24.11 rps | 0% | 3.1% | fail |
| Authentication | spike | 60 | 4300.16 ms | 4998 ms | 5002 ms | 21.05 rps | 0% | 2.28% | n/a |
| Authentication | endurance | 10 | 873.47 ms | 506 ms | 2502 ms | 18.99 rps | 0% | 0.3% | n/a |
| Checkout | normal | 10 | 1631.69 ms | 1213 ms | 2579 ms | 10 rps | 0% | -0.73% | fail |
| Checkout | peak | 25 | 1631.71 ms | 1231 ms | 2547.67 ms | 25 rps | 0% | -0.89% | fail |
| Checkout | spike | 60 | 1684.73 ms | 1261 ms | 2990 ms | 57 rps | 0% | 7.61% | n/a |
| Checkout | endurance | 10 | 1659.2 ms | 1212 ms | 2580.67 ms | 10 rps | 0% | -5.12% | pass |


## Peak resources

- Product discovery / normal: peak CPU 0.71% , peak memory 159.1 MiB , peak block I/O 20.0 KiB
- Product discovery / peak: peak CPU 2.81% , peak memory 190.9 MiB , peak block I/O 20.0 KiB
- Product discovery / spike: peak CPU 0.19% , peak memory 191.5 MiB , peak block I/O 20.0 KiB
- Product discovery / endurance: peak CPU 0.86% , peak memory 156.8 MiB , peak block I/O 20.0 KiB
- Search / normal: peak CPU 0% , peak memory 165.5 MiB , peak block I/O 20.0 KiB
- Search / peak: peak CPU 0.11% , peak memory 171.2 MiB , peak block I/O 20.0 KiB
- Search / spike: peak CPU 0.08% , peak memory 184.5 MiB , peak block I/O 20.0 KiB
- Search / endurance: peak CPU 0.03% , peak memory 173.5 MiB , peak block I/O 20.0 KiB
- Authentication / normal: peak CPU 18.5% , peak memory 88.2 MiB , peak block I/O 24.0 KiB
- Authentication / peak: peak CPU 101.51% , peak memory 91.1 MiB , peak block I/O 24.0 KiB
- Authentication / spike: peak CPU 100.93% , peak memory 92.1 MiB , peak block I/O 24.0 KiB
- Authentication / endurance: peak CPU 48.17% , peak memory 93.2 MiB , peak block I/O 24.0 KiB
- Checkout / normal: peak CPU 0.21% , peak memory 92.2 MiB , peak block I/O 24.0 KiB
- Checkout / peak: peak CPU 0.38% , peak memory 93.9 MiB , peak block I/O 24.0 KiB
- Checkout / spike: peak CPU 0.53% , peak memory 99.7 MiB , peak block I/O 24.0 KiB
- Checkout / endurance: peak CPU 0.73% , peak memory 96.4 MiB , peak block I/O 24.0 KiB

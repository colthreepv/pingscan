pscan
=====

pscan is a simple tool for ICMP scanning, trying to detect if there are alive devices near you (or just devices that reply to ICMP ping packets)

# How to use

`pscan` will enumerate all the subnets available in your computer and ping all the hosts over all the networks

`pscan [cidr] [anothercidr]` will send ICMP packets only to the

**Example**: `pscan 1.1.2.1/16` will scan _255*255_ hosts from 1.1.1.1 to 1.1.254.254


# Change Log
## [2.0.0] - 2017-01-15
### Changed
- Underlying library changed to [net-ping](https://www.npmjs.com/package/net-ping)
- Should work without compilation on Windows x64 & Node 6.x, other platforms should compile [raw-socket](https://www.npmjs.com/package/raw-socket)

## [1.0.0] - 2016-12-19
### Added
- Working with [ping](https://www.npmjs.com/package/ping)

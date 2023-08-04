**A redirect management script designed to run either as a [CloudFront Function](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-functions.html) or [Lambda@Edge Function](https://aws.amazon.com/lambda/edge/) directly on CloudFront's edge location servers.**

* Per-hostname and per-path redirects
* Both permanent (301) and temporary (302) redirects
* Simple string comparisons as well as regular expressions with capture groups
* The option to consider or ignore querystring parameters from the request URL when matching
* The option to merge in querystring parameters from the request URL into the destination redirect URL
* Default redirects for both unmatched paths as well as unspecified hosts

## Usage
Deploy this script on the Viewer Request event of your CloudFront distribution after editing the `routes` object to define your redirect mappings. 

Comparisons are made sequentially starting from the first item in the array, with any match stopping further comparisons from taking place.

Default mappings (via the `"*"` path value) are optional, and should only be used if you don't want CloudFront to pass through any requests to your origin server.

## Testing locally
You can test the script locally by simply calling it from the CLI like `node handler.js`. The final two lines of the script include a mocked CloudFront event object and `console` log to demonstrate usage. Be sure to remove these before deploying to CloudFront.

## CloudFront Functions or Lambda@Edge?
This script will operate on either edge computing solution.

CloudFront Functions are designed to execute quicker (<1ms) and be more cost effective than Lambda@Edge, which is perfect for something run with every request. But to achieve this, there are [many limitations](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-javascript-runtime-features.html) in the execution environment - including the total size of the function (<10KB). Because of this, you might be able to store approximately 50 redirect mappings before you need to switch to Lambda@Edge - or more if you minify the JavaScript.

These CloudFront Function limitations are also why this script avoids more modern JavaScript features.

More comparison details can be found in [this introductory blog post](https://aws.amazon.com/blogs/aws/introducing-cloudfront-functions-run-your-code-at-the-edge-with-low-latency-at-any-scale/).

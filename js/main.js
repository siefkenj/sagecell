import sagecell from "./sagecell";
import cell from "./cell";
import "./jquery-global";

// TODO: put this tracking code in a site-specific file.
// TODO: finish implementing our own stats service that handles,
//       the phone apps, for example.
import { _gaq } from "./gaq";
_gaq.push(["sagecell._setAccount", "UA-29124745-1"]);
_gaq.push(["sagecell._setDomainName", "sagemath.org"]);
_gaq.push(["sagecell._trackPageview"]);

(function () {
    var ga = document.createElement("script");
    ga.type = "text/javascript";
    ga.async = true;
    ga.src =
        ("https:" == document.location.protocol
            ? "https://ssl"
            : "http://www") + ".google-analytics.com/ga.js";
    var s = document.getElementsByTagName("script")[0];
    s.parentNode.insertBefore(ga, s);
})();

/**
 * Creates a promise and hoists its `resolve` method so that
 * it can be called externally.
 */
function makeResolvablePromise() {
    const ret = { promise: null, resolve: null, state: "pending" };
    ret.promise = new Promise((resolve) => {
        ret.resolve = (...args) => {
            ret.state = "fulfilled";
            return resolve(...args);
        };
    });
    return ret;
}

// Set up the global sagecell variable. This needs to be done right away because other
// scripts want to access window.sagecell.
Object.assign(sagecell, {
    templates: {
        minimal: {
            // for an evaluate button and nothing else.
            editor: "textarea-readonly",
            hide: ["editor", "files", "permalink"],
        },
        restricted: {
            // to display/evaluate code that can't be edited.
            editor: "codemirror-readonly",
            hide: ["files", "permalink"],
        },
    },
    allLanguages: [
        "sage",
        "gap",
        "gp",
        "html",
        "macaulay2",
        "maxima",
        "octave",
        "python",
        "r",
        "singular",
    ],
    // makeSagecell must be available as soon as the script loads,
    // but we may not be ready to process data right away, so we
    // provide a wrapper that will poll until sagecell is ready.
    makeSagecell: function (args) {
        // Clients expect to receive a `cellInfo` object right away.
        // However, this object cannot be made available until the page loads.
        // If we're not ready, we return a stub object that gets updated with
        // the proper data when it becomes available.
        if (sagecell._initPromise.state === "pending") {
            const ret = {};
            sagecell._initPromise.promise
                .then(() => {
                    const cellInfo = window.sagecell._makeSagecell(args);
                    Object.assign(ret, cellInfo);
                })
                .catch((e) => {
                    console.warn("Encountered error in makeSagecell", e);
                });
            return ret;
        } else {
            return window.sagecell._makeSagecell(args);
        }
    },
    _initPromise: makeResolvablePromise(),
});

// Purely for backwards compatibility
window.singlecell = sagecell;
window.singlecell.makeSinglecell = window.singlecell.makeSagecell;

/**
 * Retrieve the kernel index associated with `key`. If
 * needed, this function will push `null` onto the kernel
 * stack, providing a space for the kernel to be initialized.
 */
function linkKeyToIndex(key) {
    sagecell.linkKeys = sagecell.linkKeys || {};
    if (key in sagecell.linkKeys) {
        return sagecell.linkKeys[key];
    }

    sagecell.kernels = sagecell.kernels || [];
    // Make sure we have a kernel to share for our new key.
    const index = sagecell.kernels.push(null) - 1;
    sagecell.linkKeys[key] = index;
    return index;
}

sagecell._makeSagecell = function (args) {
    console.info("sagecell.makeSagecell called");
    // If `args.linkKey` is set, we force the `linked` option to be true.
    if (args.linkKey) {
        args = Object.assign({}, args, { linked: true });
    }

    var cellInfo = {};
    if (args.linked && args.linkKey) {
        cell.make(args, cellInfo, linkKeyToIndex(args.linkKey));
    } else {
        cell.make(args, cellInfo);
    }
    console.info("sagecell.makeSagecell finished");
    return cellInfo;
};
sagecell.deleteSagecell = function (cellInfo) {
    cell.delete(cellInfo);
};
sagecell.moveInputForm = function (cellInfo) {
    cell.moveInputForm(cellInfo);
};
sagecell.restoreInputForm = function (cellInfo) {
    cell.restoreInputForm(cellInfo);
};

sagecell._initPromise.resolve();

export default sagecell;
export { sagecell };

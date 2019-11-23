import rule from '../../src/rules/order'
import ruleTester from '../index'

ruleTester.run('order', rule, {
    valid: [
        'const NUMBER = 5', // should not report errors if no imports in file
        `
import path from "path";
import fs from "fs";

import { readOnly } from "@ember/object/computed";
import EmberObject, { set, observer, get, computed } from "@ember/object";
import { A as Array } from "@ember/array";

import moment from "moment";
import { task, timeout } from "ember-concurrency";

import { accessLevels } from "showbie/models/assignment-schedule";
        `,
    ],
    invalid: [
        {
            code: `
import { readOnly } from "@ember/object/computed";
import path from "path";

import fs from "fs";
import EmberObject, { set, observer, get, computed } from "@ember/object";
import { A as Array } from "@ember/array";
import moment from "moment";
import { task, timeout } from "ember-concurrency";
import { accessLevels } from "showbie/models/assignment-schedule";
            `,
            output: ``,
            errors: [
                'There should be at least one empty line between import groups',
            ],
        },
    ],
})

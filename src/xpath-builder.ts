interface XPathParam {
    path: '' | '/' | '//' | './',
    node: string
}

enum XPathAttributes {
    CLASS = "class",
    ID = "id",
    INDEX = "index",
    NOT = "not",
    POSITION = "position",
    CONTAINS = "contains",
    EQUAL = "equal",
    HAS = "has",
}

interface XPathClassParam {
    [XPathAttributes.CLASS]: string
}

interface XPathIdParam {
    [XPathAttributes.ID]: string
}

interface XPathIndexParam {
    [XPathAttributes.INDEX]: number
}

interface XPathPositionParam {
    [XPathAttributes.POSITION]: `>${number}` | `<${number}` | `=${number}`
}

interface XPathContainsParam {
    [XPathAttributes.CONTAINS]: {
        attr: string,
        value: string
    }
}
interface XPathEqualParam {
    [XPathAttributes.EQUAL]: {
        attr: string,
        value: string
    }
}
interface XPathExistParam {
    [XPathAttributes.HAS]: string
}
interface XPathNotParam {
    [XPathAttributes.NOT]: XPathAttrParam
}

type XPathSelector = XPathClassParam 
    & XPathIdParam 
    & XPathPositionParam 
    & XPathContainsParam
    & XPathEqualParam
    // & XPathIndexParam
    & XPathExistParam

type XPathCondition = XPathNotParam

type XPathAttrParam = Partial<XPathSelector & XPathCondition>
type XPathParamWithAttr = XPathParam & XPathAttrParam

export class XPath {
    str: string

    public static contains(attr: string, value: string) {
        return `contains(@${attr}, "${value}")`
    }
    public static equal(attr: string, value: string) {
        return `@${attr}="${value}"`
    }
    public static exist(attr: string) {
        return `@${attr}`
    }

    constructor(param: XPathParamWithAttr) {
        this.str = param.path
        this.str += param.node
        const expression = this.parseParam(param)
        if(expression.length)
            this.str += `[${expression}]`
    }

    private parseParam(param: XPathAttrParam) {
        let selectors = [];
        if(XPathAttributes.CONTAINS in param) {
            const { attr, value } = param[XPathAttributes.CONTAINS]
            selectors.push(XPath.contains(attr, value))
        }
        if(XPathAttributes.EQUAL in param) {
            const { attr, value } = param[XPathAttributes.EQUAL]
            selectors.push(XPath.contains(attr, value))
        }

        if(XPathAttributes.CLASS in param) {
            selectors.push(XPath.contains("class", param[XPathAttributes.CLASS]))
        } 
        if(XPathAttributes.ID in param) {
            selectors.push(XPath.equal("id", param[XPathAttributes.ID]))
        }
        if(XPathAttributes.POSITION in param) {
            selectors.push(`position()${param[XPathAttributes.POSITION]}`)
        }
        if(XPathAttributes.HAS in param) {
            selectors.push(XPath.exist(param[XPathAttributes.HAS]))
        }
        if(XPathAttributes.NOT in param) {
            selectors.push(`not(${this.parseParam(param[XPathAttributes.NOT])})`)
        }
        return selectors.join(' and ')
    }
    
    toString() {
        return this.str
    }

    build() {
        if(
            process.env.NODE_ENV === 'development'
            || process.env.NODE_ENV === 'test'
        ) 
            console.log(`XPath build: ${this.toString()}`)
        return this.toString()
    }

    child(node: string, param?: XPathAttrParam) {
       const childXPath = new XPath({
            ...param,
            node,
            path: '/'
        })
        this.str += childXPath.str
        return this
    }

    desc(node: string, param?: XPathAttrParam) {
        const childXPath = new XPath({
            ...param,
            node,
            path: '//'
        })
        this.str += childXPath.str
        return this
    }

    attr(name: string) {
        this.str += `/@${name}`
        return this
    }

    group(param?: XPathAttrParam) {
        this.str = `(${this.str})`
        return this
    }

    static absolute(node: string, param?: XPathAttrParam) {
        return new XPath({
            ...param,
            node,
            path: '/'
        })
    }
    static anywhere(node: string, param?: XPathAttrParam) {
        return new XPath({
            ...param,
            node,
            path: '//'
        })
    }
    static relative(node: string, param?: XPathAttrParam) {
        return new XPath({
            ...param,
            node,
            path: './'
        })
    }
    static node(node: string, param?: XPathAttrParam) {
        return new XPath({
            ...param,
            node,
            path: ''
        })
    }
}
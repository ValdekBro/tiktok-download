interface XPathParam {
    path: '' | '/' | '//' | './',
    node: string
}

enum XPathAttributes {
    CLASS = "class",
    ID = "id",
    INDEX = "index",
    POSITION = "position",
    CONTAINS = "contains",
    EQUAL = "equal",
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


type XPathAttrParam = Partial<
    XPathClassParam 
    & XPathIdParam 
    & XPathPositionParam 
    & XPathContainsParam
    & XPathEqualParam
    // & XPathIndexParam
>
type XPathParamWithAttr = XPathParam & XPathAttrParam

export class XPath {
    str: string

    public static contains(attr: string, value: string) {
        return `contains(@${attr}, "${value}")`
    }
    public static equal(attr: string, value: string) {
        return `@${attr}="${value}"`
    }

    constructor(param: XPathParamWithAttr) {
        this.str = param.path
        this.str += param.node
        if(XPathAttributes.CONTAINS in param) {
            const { attr, value } = param[XPathAttributes.CONTAINS]
            this.str += `[${XPath.contains(attr, value)}]`
        }
        if(XPathAttributes.EQUAL in param) {
            const { attr, value } = param[XPathAttributes.EQUAL]
            this.str += `[${XPath.contains(attr, value)}]`
        }

        if(XPathAttributes.CLASS in param) {
            this.str += `[${XPath.contains("class", param[XPathAttributes.CLASS])}]`
        } 
        if(XPathAttributes.ID in param) {
            this.str += `[${XPath.equal("id", param[XPathAttributes.ID])}]`
        }
        if(XPathAttributes.POSITION in param) {
            this.str += `[position()${param[XPathAttributes.POSITION]}]`
        }
    }
    
    toString() {
        return this.str
    }

    build() {
        // console.log(`XPath build: ${this.toString()}`)
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